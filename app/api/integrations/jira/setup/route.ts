import prisma from "@/lib/db";
import { JiraAPI } from "@/lib/integrations/jira/jira";
import { refreshJiraToken } from "@/lib/integrations/jira/refreshToken";
import { JiraProjectsResponse } from "@/lib/integrations/types";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { UserIntegration } from "@prisma/client";

/**
 * Ensures we have a valid (non-expired) Jira access token.
 * If the current token is expired, refreshes it using the refresh token.
 * @param integration - The user's Jira integration record from database
 * @returns A valid access token for Jira API calls
 */
async function getValidToken(integration: UserIntegration) {
  // Check if token is expired and refresh if needed
  if (integration.expiresAt && new Date() > integration.expiresAt) {
    const updated = await refreshJiraToken(integration);
    return updated.accessToken;
  }

  // Token is still valid, return as-is
  return integration.accessToken;
}

/**
 * GET handler - Fetches available Jira projects for the authenticated user.
 * Used by the frontend to populate project selection dropdown during setup.
 * @returns JSON response with array of available Jira projects
 */
export async function GET() {
  // Authenticate user
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthoarized" }, { status: 401 });
  }

  // Verify user has Jira integration configured
  const integration = await prisma.userIntegration.findUnique({
    where: {
      userId_platform: {
        userId: userId,
        platform: "jira",
      },
    },
  });
  if (!integration || !integration.workspaceId) {
    return NextResponse.json({ error: "not connected" }, { status: 400 });
  }

  try {
    // Get valid access token (refresh if expired)
    const validToken = await getValidToken(integration);
    const jira = new JiraAPI();

    // Fetch projects from Jira API
    const projects = (await jira.getProjects(
      validToken,
      integration.workspaceId
    )) as JiraProjectsResponse;

    // Return projects list to frontend
    return NextResponse.json({
      projects: projects.values || [],
    });
  } catch (error) {
    console.error("error fetching jira projects:", error);
    return NextResponse.json(
      { error: "failed to fetch proejcts" },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Configures Jira project destination for the integration.
 * Supports both selecting existing projects and creating new ones.
 * Updates the user's integration record with the selected/created project details.
 * @param request - Contains projectId, projectName, projectKey, createNew flags
 * @returns JSON response with success status and project details
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  const { userId } = await auth();

  // Parse request body for project configuration
  const { projectId, projectName, projectKey, createNew } =
    await request.json();

  if (!userId) {
    return NextResponse.json({ error: "unauthoarized" }, { status: 401 });
  }

  // Verify user has Jira integration configured
  const integration = await prisma.userIntegration.findUnique({
    where: {
      userId_platform: {
        userId: userId,
        platform: "jira",
      },
    },
  });
  if (!integration || !integration.workspaceId) {
    return NextResponse.json({ error: "not connected" }, { status: 400 });
  }

  try {
    // Get valid access token
    const validToken = await getValidToken(integration);
    const jira = new JiraAPI();

    // Initialize final project variables
    // let finalProjectId = projectId;
    const finalProjectName = projectName;
    const finalProjectKey = projectKey;

    // Handle creating a new project
    if (createNew && projectName) {
      try {
        // Generate suggested project key from name (uppercase, alphanumeric, max 10 chars)
        const suggestedKey = projectName
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .substring(0, 10);
        const key = projectKey || suggestedKey;

        // Create new project via Jira API
        // const newProject =
        await jira.createProject(
          validToken,
          integration.workspaceId,
          projectName,
          key
        );

        // Update final project details with created project
        // finalProjectId = newProject.id;
        // finalProjectName = projectName;
        // finalProjectKey = newProject.key;
      } catch (error) {
        console.error("failed to create prohect:", error);
        return NextResponse.json(
          {
            error:
              "failed to create project. you may not have admin permisisons",
          },
          { status: 403 }
        );
      }
    }
    // Handle selecting an existing project
    else if (projectId) {
      // Fetch available projects to validate selection
      const projects = (await jira.getProjects(
        validToken,
        integration.workspaceId
      )) as JiraProjectsResponse;

      // Find the selected project
      const selectedProject = projects.values.find((p) => p.id === projectId);

      if (!selectedProject) {
        return NextResponse.json(
          { error: "project not found" },
          { status: 404 }
        );
      }

      // Update final project details with selected project
      // finalProjectKey = selectedProject.key;
      // finalProjectName = selectedProject.name;
    }
    // Invalid request - neither creating new nor selecting existing
    else {
      return NextResponse.json(
        {
          error:
            "either projectId or createNew with projectName must be provided",
        },
        { status: 400 }
      );
    }

    // Save project configuration to database
    await prisma.userIntegration.update({
      where: {
        id: integration.id,
      },
      data: {
        projectId: finalProjectKey,
        projectName: finalProjectName,
      },
    });

    // Return success response with project details
    return NextResponse.json({
      success: true,
      projectId: finalProjectKey,
      projectName: finalProjectName,
    });
  } catch (error) {
    console.error("Error setting up jira project:", error);
    return NextResponse.json(
      { error: "Failed to setup project" },
      { status: 500 }
    );
  }
}
