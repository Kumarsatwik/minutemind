/**
 * Wrapper class for interacting with the Asana API.
 * Provides methods to fetch workspaces, projects, and create new projects and tasks.
 */
import { ActionItemData } from "../types";

export class AsanaAPI {
  private baseUrl = "https://app.asana.com/api/1.0";

  /**
   * Fetches all workspaces accessible to the user.
   * @param token - The access token for authentication.
   * @returns Promise resolving to the workspaces data.
   */
  async getWorkspaces(token: string) {
    const response = await fetch(`${this.baseUrl}/workspaces`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch workspaces");
    }
    return response.json();
  }

  /**
   * Fetches projects within a specific workspace.
   * @param token - The access token for authentication.
   * @param workspaceId - The ID of the workspace to fetch projects from.
   * @returns Promise resolving to the projects data.
   */
  async getProjects(token: string, workspaceId: string) {
    const response = await fetch(
      `${this.baseUrl}/projects?workspace=${workspaceId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch projects");
    }
    return response.json();
  }

  /**
   * Creates a new project in the specified workspace.
   * @param token - The access token for authentication.
   * @param workspaceId - The ID of the workspace to create the project in.
   * @param name - The name of the new project.
   * @returns Promise resolving to the created project data.
   */
  async createProject(token: string, workspaceId: string, name: string) {
    const response = await fetch(`${this.baseUrl}/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          name: name,
          workspace: workspaceId,
        },
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch projects");
    }
    return response.json();
  }

  /**
   * Creates a new task in the specified project using action item data.
   * @param token - The access token for authentication.
   * @param projectId - The ID of the project to create the task in.
   * @param data - The action item data containing title, description, etc.
   * @returns Promise resolving to the created task data.
   */
  async createTask(token: string, projectId: string, data: ActionItemData) {
    const response = await fetch(`${this.baseUrl}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          name: data.title,
          project: projectId,
          notes: data.description || "Action Item from the meeting",
          projects:[projectId],
        },
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to create projects");
    }
    return response.json();
  }
}
