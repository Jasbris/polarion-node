import {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	HttpRequest,
	LoadOptions,
} from 'n8n-workflow';

// --------------------------------------------------------------------------------------
// HELPER FUNCTION: Centralized API Request Handler
// --------------------------------------------------------------------------------------

/**
 * Handles all requests to the Polarion API, managing authentication and error handling.
 */
async function polarionApiRequest(
	this: IExecuteFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE',
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string, // Allows overriding the resource path with a custom URI
): Promise<IDataObject> {
	const credentials = await this.getCredentials('polarionApi') as IDataObject;
	if (!credentials) {
		throw new NodeOperationError(this.getNode(), 'Polarion credentials are not set.');
	}

	const baseUrl = credentials.baseUrl as string;
	const authentication = credentials.authentication as string;
	let authHeader: string;

	// Determine authentication header based on user selection
	if (authentication === 'basic') {
		const username = credentials.username as string;
		const password = credentials.password as string;
		const authString = Buffer.from(`${username}:${password}`).toString('base64');
		authHeader = `Basic ${authString}`;
	} else if (authentication === 'pat') {
		const pat = credentials.pat as string;
		// Polarion often supports Basic Auth using PAT as password against a placeholder user,
		// or standard Bearer. We assume standard Bearer for modern PAT usage.
		authHeader = `Bearer ${pat}`;
	} else {
		throw new NodeOperationError(this.getNode(), 'Invalid authentication method specified in credentials.');
	}

	const options: HttpRequest = {
		baseURL: baseUrl,
		url: uri || resource, // Use custom URI if provided, otherwise standard resource path
		method,
		body,
		qs,
		json: true,
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'Authorization': authHeader,
		},
	};

	try {
		this.logger.debug(`Executing Polarion API Request: ${method} ${options.url}`);
		return await this.helpers.request!(options);
	} catch (error) {
		// Log detailed error from the API response
		this.logger.error('Polarion API Error:', (error as IDataObject).response?.data || error.message);
		throw new NodeOperationError(this.getNode(), `Polarion API request failed: ${error.message}`, {
            response: (error as IDataObject).response?.data,
        });
	}
}

// --------------------------------------------------------------------------------------
// RESOURCE SPECIFIC PROPERTIES
// Defines properties for Work Items, Documents, and Projects. Other resources follow a generic pattern.
// --------------------------------------------------------------------------------------

const workItemFields: INodeProperties[] = [
	{
		displayName: 'Work Item ID',
		name: 'workItemId',
		type: 'string',
		default: '',
		placeholder: 'MyProject-123',
		description: 'The ID of the work item to retrieve, update, or delete.',
		required: true,
		displayOptions: {
			show: {
				resource: ['workItems'],
				operation: ['get', 'update', 'delete'],
			},
		},
	},
	{
		displayName: 'PQL Query (List)',
		name: 'query',
		type: 'string',
		default: 'status:open',
		description: 'Polarion Query Language (PQL) string to filter work items (e.g., type:Defect)',
		displayOptions: {
			show: {
				resource: ['workItems'],
				operation: ['list'],
			},
		},
	},
];

const documentFields: INodeProperties[] = [
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'string',
		default: '',
		placeholder: 'MyProject/Specification',
		description: 'The ID of the Document (often path-based: Project/Space/Name)',
		required: true,
		displayOptions: {
			show: {
				resource: ['documents'],
				operation: ['get', 'update', 'delete'],
			},
		},
	},
];

const projectFields: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		default: '',
		placeholder: 'MyProject',
		description: 'The ID of the Project.',
		required: true,
		displayOptions: {
			show: {
				resource: ['projects'],
				operation: ['get', 'update', 'delete'],
			},
		},
	},
];

// Generic Fields for Create/Update operations across most resources
const genericDataField: INodeProperties = {
	displayName: 'Data (JSON)',
	name: 'data',
	type: 'json',
	default: '{}',
	description: 'JSON payload containing the data for Create or Update operations. Refer to Polarion API documentation for required schema.',
	displayOptions: {
		show: {
			operation: ['create', 'update'],
		},
	},
};

// Generic ID field for the 10 simpler resources
const simpleResourceIdField: INodeProperties = {
    displayName: 'Resource ID',
    name: 'resourceId',
    type: 'string',
    default: '',
    placeholder: 'resource_id_123',
    description: 'The ID of the resource to Get, Update, or Delete.',
    required: true,
    displayOptions: {
        show: {
            resource: ['users', 'enumerations', 'jobs', 'collections', 'plans', 'pages', 'testRuns', 'testRecords', 'testSteps', 'approvals'],
            operation: ['get', 'update', 'delete'],
        },
    },
};


// Combine all resource-specific and generic fields
const allProperties: INodeProperties[] = [
    ...workItemFields,
    ...documentFields,
    ...projectFields,
    simpleResourceIdField, // Used for the large set of simpler resources
    genericDataField, // Used for Create/Update generic JSON body
];


/**
 * The Polarion Node Definition
 */
export class Polarion implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Polarion',
		name: 'polarion',
		icon: 'file:polarion.svg', // Assumes polarion.svg exists in the directory
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter.operation}}: {{$parameter.resource}}',
		description: 'Interact with the Siemens Polarion REST API',
		credentials: [
			{
				name: 'polarionApi',
				required: true,
			},
		],
		defaults: {
			name: 'Polarion',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			// 1. RESOURCE Selector
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{ name: 'Work Item', value: 'workItems' },
					{ name: 'Document', value: 'documents' },
					{ name: 'Project', value: 'projects' },
					{ name: 'User', value: 'users' },
					{ name: 'Enumeration', value: 'enumerations' },
					{ name: 'Job', value: 'jobs' },
					{ name: 'Collection', value: 'collections' },
					{ name: 'Plan', value: 'plans' },
					{ name: 'Page', value: 'pages' },
					{ name: 'Test Run', value: 'testRuns' },
					{ name: 'Test Record', value: 'testRecords' },
					{ name: 'Test Step', value: 'testSteps' },
					{ name: 'Approval', value: 'approvals' },
				],
				default: 'workItems',
				required: true,
				description: 'The Polarion resource to interact with.',
			},
			// 2. OPERATION Selector
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{ name: 'List', value: 'list', description: 'List resources (search/query).' },
					{ name: 'Get', value: 'get', description: 'Retrieve a single resource by ID.' },
					{ name: 'Create', value: 'create', description: 'Create a new resource.' },
					{ name: 'Update', value: 'update', description: 'Update an existing resource by ID.' },
					{ name: 'Delete', value: 'delete', description: 'Delete a resource by ID.' },
				],
				default: 'list',
				required: true,
				description: 'The operation to perform.',
			},

			// 3. RESOURCE-SPECIFIC FIELDS
			...allProperties,

			// 4. COMMON LIST/QUERY OPTIONS
			{
				displayName: 'Common Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Options',
				description: 'Additional parameters for querying the API.',
				displayOptions: {
					show: {
						operation: ['list', 'get'],
					},
				},
				options: [
					{
						displayName: 'Fields to Return',
						name: 'fields',
						type: 'string',
						default: '',
						placeholder: 'id,title,status',
						description: 'Comma-separated list of fields to return (optimization parameter).',
					},
					{
						displayName: 'Limit (Maximum Results)',
						name: 'limit',
						type: 'number',
						default: 50,
						description: 'Max number of results to return (default: 50).',
						displayOptions: {
							show: {
								operation: ['list'],
							},
						},
					},
					{
						displayName: 'Skip (Offset)',
						name: 'skip',
						type: 'number',
						default: 0,
						description: 'Number of results to skip (for pagination).',
						displayOptions: {
							show: {
								operation: ['list'],
							},
						},
					},
				],
			},
		],
	};

	// --------------------------------------------------------------------------------------
	// EXECUTION LOGIC
	// --------------------------------------------------------------------------------------

	async execute(this: IExecuteFunctions): Promise<IDataObject[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			let endpoint = `/${resource}`; // Base path: /workItems
			let method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET';
			let uri: string | undefined = undefined; // Custom URI override
			const body: IDataObject = {};

			const options = this.getNodeParameter('options', i, {}) as IDataObject;
			const qs: IDataObject = {};

			// Apply common query parameters (fields, limit, skip)
			if (options.fields) {
				qs.fields = options.fields;
			}
			if (operation === 'list') {
				qs.limit = options.limit || 50;
				qs.skip = options.skip || 0;
			}

			try {
				if (operation === 'create' || operation === 'update') {
					const rawData = this.getNodeParameter('data', i) as string;
					Object.assign(body, JSON.parse(rawData));
					method = operation === 'create' ? 'POST' : 'PUT';
				} else if (operation === 'delete') {
					method = 'DELETE';
				}

				// --- Resource Routing ---

				if (resource === 'workItems') {
					if (operation === 'get' || operation === 'update' || operation === 'delete') {
						const workItemId = this.getNodeParameter('workItemId', i) as string;
						endpoint += `/${workItemId}`;
					} else if (operation === 'list') {
						const query = this.getNodeParameter('query', i) as string;
						qs.query = query; // PQL Query parameter
					}
					// Create uses default endpoint /workItems (POST)
				}
				else if (resource === 'documents') {
					if (operation === 'get' || operation === 'update' || operation === 'delete') {
						const documentId = this.getNodeParameter('documentId', i) as string;
						// Document IDs often contain slashes and must be URL encoded
						endpoint += `/${encodeURIComponent(documentId)}`;
					}
				}
				else if (resource === 'projects') {
					if (operation === 'get' || operation === 'update' || operation === 'delete') {
						const projectId = this.getNodeParameter('projectId', i) as string;
						endpoint += `/${projectId}`;
					}
					// List/Create use default endpoint /projects
				}
				else if (['users', 'enumerations', 'jobs', 'collections', 'plans', 'pages', 'testRuns', 'testRecords', 'testSteps', 'approvals'].includes(resource)) {
					// Generic handling for resources that require a simple ID or default list/create
					if (operation === 'get' || operation === 'update' || operation === 'delete') {
						const resourceId = this.getNodeParameter('resourceId', i) as string;
						endpoint += `/${resourceId}`;
					}
					// List/Create use default endpoint
				}
				else {
					throw new NodeOperationError(this.getNode(), `Resource "${resource}" routing error.`);
				}

				// Execute the API Call
				const responseData = await polarionApiRequest.call(this, method, endpoint, body, qs, uri);

				// Standardize output format
				if (responseData.data && Array.isArray(responseData.data)) {
					// Handles API responses that wrap list data in a 'data' array
					returnData.push(...responseData.data as IDataObject[]);
				} else if (Array.isArray(responseData)) {
					returnData.push(...responseData as IDataObject[]);
				} else {
					returnData.push(responseData);
				}

			} catch (error) {
				if (this.continueOnFail()) {
					// If continueOnFail is enabled, catch the error and push an object containing the error message
					returnData.push({ error: error.message, itemIndex: i });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}