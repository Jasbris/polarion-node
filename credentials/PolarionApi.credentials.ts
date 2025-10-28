import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Defines the Polarion API credentials structure, allowing users to configure the base URL
 * and choose between Basic Authentication (Username/Password) or Personal Access Token (PAT).
 */
export class PolarionApi implements ICredentialType {
	name = 'polarionApi';
	displayName = 'Polarion API';
	// Standard authentication scheme required by n8n for token/basic access
	documentationUrl = 'https://docs.n8n.io/integrations/creating-nodes/build/reference/credentials-files/';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://polarion.example.com/polarion/api/rest/v1',
			placeholder: 'https://polarion.example.com/polarion/api/rest/v1',
			description: 'The base URL of your Polarion instance REST API (Must include /polarion/api/rest/v1)',
			required: true,
		},
		{
			displayName: 'Authentication Method',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'Basic Auth (Username and Password)',
					value: 'basic',
				},
				{
					name: 'Personal Access Token (PAT)',
					value: 'pat',
				},
			],
			default: 'basic',
			description: 'Select the authentication method to use.',
		},
		// Basic Auth Fields
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					authentication: [
						'basic',
					],
				},
			},
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			displayOptions: {
				show: {
					authentication: [
						'basic',
					],
				},
			},
		},
		// PAT Field
		{
			displayName: 'Personal Access Token',
			name: 'pat',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your generated Polarion Personal Access Token.',
			displayOptions: {
				show: {
					authentication: [
						'pat',
					],
				},
			},
		},
	];
}