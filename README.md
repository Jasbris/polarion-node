# n8n Polarion Node

This custom n8n node facilitates integration with the Siemens Polarion Application Lifecycle Management (ALM) tool via its REST API (`/polarion/api/rest/v1`).

## Configuration

### Credentials

1.  **Base URL:** Enter the full REST API path for your Polarion instance (e.g., `https://polarion.example.com/polarion/api/rest/v1`).
2.  **Authentication:** Choose between Basic Auth (Username/Password) or Personal Access Token (PAT).

## Supported Resources and Operations

This node supports standard CRUD operations (List, Get, Create, Update, Delete) on the following Polarion resources:

*   **Work Items:** Query using PQL for filtering.
*   **Documents:** Access documents, typically using project/space paths as IDs.
*   **Projects**
*   **Users**
*   **Enumerations**
*   **Jobs**
*   **Collections**
*   **Plans**
*   **Pages**
*   **Test Runs**
*   **Test Records**
*   **Test Steps**
*   **Approvals**

## Usage Notes

*   **PQL Query:** For the `List` operation on resources like **Work Items**, use the Polarion Query Language (PQL) string in the `PQL Query` field for complex filtering.
*   **Data (JSON):** For `Create` and `Update` operations, the JSON payload must strictly follow the schema defined in the official Polarion REST API documentation for the selected resource.
*   **IDs:** Resource IDs (especially for Documents) must be URL-encoded if they contain special characters like slashes (`/`). The node handles the encoding automatically based on standard API patterns.
