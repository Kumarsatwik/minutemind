import prisma from "@/lib/db";

export async function authorizeSlack(source: { teamId?: string }) {
  try {
    const { teamId } = source;
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    const installation = await prisma.slackInstallation.findUnique({
      where: {
        teamId,
      },
    });
    if (!installation || !installation.active) {
      console.error("installation not found or inactive for the team:", teamId);
      throw new Error("Slack installation not found");
    }
    return {
      botToken: installation.botToken,
      teamId: installation.teamId,
    };
  } catch (error) {
    console.error("error authorizing slack:", error);
    throw error;
  }
}
