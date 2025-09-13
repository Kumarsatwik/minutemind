import prisma from "@/lib/db";
import { TrelloAPI } from "@/lib/integrations/trello/trello";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET handler - Fetches available Trello boards for the authenticated user.
 * Used by the frontend to populate board selection dropdown during setup.
 * @returns JSON response with array of available Trello boards
 */
export async function GET() {
  // Authenticate user
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthoarized" }, { status: 401 });
  }

  // Verify user has Trello integration configured
  const integration = await prisma.userIntegration.findUnique({
    where: {
      userId_platform: {
        userId,
        platform: "trello",
      },
    },
  });

  if (!integration) {
    return NextResponse.json({ error: "not connected" }, { status: 400 });
  }

  try {
    const trello = new TrelloAPI();

    // Fetch boards from Trello API
    const boards = await trello.getBoards(integration.accessToken);

    // Return boards list to frontend
    return NextResponse.json({ boards });
  } catch (error) {
    console.error("error fetching trello boards:", error);
    return NextResponse.json(
      { error: "failed to fetch boards" },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Configures Trello board destination for the integration.
 * Supports both selecting existing boards and creating new ones.
 * Updates the user's integration record with the selected/created board details.
 * @param request - Contains boardId, boardName, createNew flags
 * @returns JSON response with success status and board details
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  const { userId } = await auth();

  // Parse request body for board configuration
  const { boardId, boardName, createNew } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "unauthoarized" }, { status: 401 });
  }

  // Verify user has Trello integration configured
  const integration = await prisma.userIntegration.findUnique({
    where: {
      userId_platform: {
        userId: userId,
        platform: "trello",
      },
    },
  });
  if (!integration) {
    return NextResponse.json({ error: "not connected" }, { status: 400 });
  }

  try {
    const trello = new TrelloAPI();

    // Initialize final board variables
    let finalBoardId = boardId;
    let finalBoardName = boardName;

    // Handle creating a new board
    if (createNew && boardName) {
      // Create new board via Trello API
      const newBoard = await trello.createBoard(
        integration.accessToken,
        boardName
      );

      // Update final board details with created board
      finalBoardId = newBoard.id;
      finalBoardName = newBoard.name;
    }

    // Save board configuration to database
    await prisma.userIntegration.update({
      where: {
        id: integration.id,
      },
      data: {
        boardId: finalBoardId,
        boardName: finalBoardName,
      },
    });

    // Return success response with board details
    return NextResponse.json({
      success: true,
      boardId: finalBoardId,
      boardName: finalBoardName,
    });
  } catch (error) {
    console.error("Error setting up trello board:", error);
    return NextResponse.json(
      { error: "Failed to setup board" },
      { status: 500 }
    );
  }
}
