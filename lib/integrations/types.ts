/**
 * Configuration interface for third-party integrations.
 * Represents the state and details of an integration for a user.
 */
export interface IntegrationConfig{
    platform:'trello' |'jira'|'asana'
    connected:boolean
    boardName?:string
    projectName?:string
}

/**
 * Data structure for action items that can be created in integrated platforms.
 * Used when syncing meeting action items to external tools like Asana.
 */
export interface ActionItemData{
    title:string
    description:string
    dueDate?:string
    assignee?:string
}

