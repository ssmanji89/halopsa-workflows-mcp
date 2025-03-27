# Example Prompts for HaloPSA Workflows MCP

Use these example prompts with Claude Desktop to interact with your HaloPSA workflows.

## Basic Workflow Listing

**You:** Can you list all the workflows in my HaloPSA instance?

**Claude:** I'll retrieve the workflows from your HaloPSA instance.

[Claude calls the getWorkflows tool]

Here are the workflows in your HaloPSA instance:
1. Client Onboarding (ID: 123)
2. Ticket Escalation (ID: 124)
3. Change Management (ID: 125)

## Workflow Details

**You:** Tell me more about the Client Onboarding workflow.

**Claude:** I'll get the details for the Client Onboarding workflow.

[Claude calls the getWorkflow tool with the appropriate ID]

Here are the details for the Client Onboarding workflow:
- Name: Client Onboarding
- Description: Process for setting up new clients
- Status: Active
- Steps: 6 total steps including Welcome Email, Setup Meeting, Account Creation...

## Getting Workflow Steps

**You:** What are the steps in the Change Management workflow?

**Claude:** I'll retrieve the steps for the Change Management workflow.

[Claude calls the getWorkflowSteps tool]

The Change Management workflow has the following steps:
1. Request Submission
2. Initial Review
3. Risk Assessment
4. Approval
5. Implementation
6. Post-Implementation Review

## Creating a New Workflow

**You:** Can you create a new workflow for handling software upgrades?

**Claude:** I'll help you create a new workflow for handling software upgrades. First, let me guide you through setting up the basic information for this workflow.

What would you like to include in the software upgrade workflow? Typically, we would need:
1. A name and description for the workflow
2. Whether it should be active immediately
3. The steps in the workflow

Would you like me to suggest a standard software upgrade workflow structure?

**You:** Yes, please suggest a standard structure.

**Claude:** I'll create a standard software upgrade workflow structure for you:

[Claude calls the createWorkflows tool with a payload like:]
```json
{
  "workflows": [
    {
      "name": "Software Upgrade Process",
      "description": "Standardized workflow for planning and implementing software upgrades",
      "active": true
    }
  ]
}
```

Great! I've created a new Software Upgrade Process workflow with ID 126. 

Here's the standard structure I recommend:
1. Request & Evaluation
2. Testing in Development Environment
3. Creating Deployment Plan
4. User Notification
5. Backup Current Version
6. Implementation
7. Post-Upgrade Testing
8. Documentation Update

Would you like me to explain any of these stages in more detail?

## Advanced: Workflow Analysis

**You:** Can you analyze our current workflows and suggest improvements?

**Claude:** I'll analyze your current workflows to identify potential improvements.

[Claude calls the getWorkflows tool to list all workflows]
[Claude calls the getWorkflow tool for each workflow to get details]
[Claude calls the getWorkflowSteps tool to analyze steps]

Based on my analysis of your current workflows, I've identified several opportunities for improvement:

1. **Ticket Escalation Workflow**:
   - The approval step occurs late in the process which may delay critical issues
   - Recommend moving the approval earlier and adding an urgent path for critical issues

2. **Client Onboarding Workflow**:
   - There's no feedback collection step at the end
   - Adding a follow-up step 1 week after completion could improve client satisfaction

3. **Change Management Workflow**:
   - The risk assessment criteria aren't clearly defined in step 3
   - Recommend adding explicit risk categorization (Low/Medium/High)

Would you like me to help implement any of these suggested improvements?

## Deleting a Workflow

**You:** I need to delete the test workflow with ID 127.

**Claude:** I'll help you delete the test workflow with ID 127.

[Claude calls the deleteWorkflow tool with ID 127]

I've successfully deleted the test workflow with ID 127. The workflow has been removed from your HaloPSA instance. Is there anything else you'd like to do with your workflows?