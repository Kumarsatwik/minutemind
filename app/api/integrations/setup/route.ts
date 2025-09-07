/**
 * API route for setting up Asana integrations.
 * Handles fetching available projects and workspaces, and configuring a selected or new project for the user.
 */

import prisma from "@/lib/db";
import { AsanaAPI } from "@/lib/integrations/asana/asana";
import { refreshToken } from "@/lib/integrations/asana/refreshtoken";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { UserIntegration } from "@prisma/client";

/**
 * Retrieves a valid access token for the integration.
 * If the current token is expired, refreshes it using the refresh token.
 * @param integration - The user's integration record from the database.
 * @returns The valid access token.
 */
async function getValidToken(integration: UserIntegration) {
  if (integration.expiresAt && new Date() > integration.expiresAt) {
    const updated = await refreshToken(integration);
    return updated.accessToken;
  }

  return integration.accessToken;
}

/**
 * GET handler: Fetches available workspaces and projects for the authenticated user.
 * Returns the first workspace's projects to allow selection during setup.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthoarized" }, { status: 401 });
  }

  const integration = await prisma.userIntegration.findUnique({
    where: {
      userId_platform: {
        userId: userId,
        platform: "asana",
      },
    },
  });
  if (!integration) {
    return NextResponse.json({ error: "not connected" }, { status: 400 });
  }

  try {
    const validToken = await getValidToken(integration);
    const asana = new AsanaAPI();

    const workspaces = await asana.getWorkspaces(validToken);

    const workspaceId = workspaces.data[0]?.gid;

    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 400 }
      );
    }

    const projects = await asana.getProjects(validToken, workspaceId);

    return NextResponse.json({
      projects: projects.data || [],
      workspaceId,
    });
  } catch (error) {
    console.error("error fetching asana projects:", error);
    return NextResponse.json(
      { error: "failed to fetch proejcts" },
      { status: 500 }
    );
  }
}

/**
 * POST handler: Sets up the selected or newly created Asana project for the user.
 * Updates the user's integration record with the project details.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();

  const { projectId, projectName, workspaceId, createNew } =
    await request.json();
  if (!userId) {
    return NextResponse.json({ error: "unauthoarized" }, { status: 401 });
  }

  const integration = await prisma.userIntegration.findUnique({
    where: {
      userId_platform: {
        userId: userId,
        platform: "asana",
      },
    },
  });
  if (!integration) {
    return NextResponse.json({ error: "not connected" }, { status: 400 });
  }

  try {
    const validToken = await getValidToken(integration);

    const asana = new AsanaAPI();

    let finalProjectId = projectId;
    let finalProjectName = projectName;

    if (createNew && projectName) {
      const newProject = await asana.createProject(
        validToken,
        workspaceId,
        projectName
      );
      finalProjectId = newProject.data.gid;
      finalProjectName = newProject.data.name;
    }

    await prisma.userIntegration.update({
      where: {
        id: integration.id,
      },
      data: {
        projectId: finalProjectId,
        projectName: finalProjectName,
        workspaceId: workspaceId,
      },
    });

    return NextResponse.json({
      success: true,
      projectId: finalProjectId,
      projectName: finalProjectName,
    });
  } catch (error) {
    console.error("Error setting up asana project:", error);
    return NextResponse.json(
      { error: "Failed to setup project" },
      { status: 500 }
    );
  }
}
