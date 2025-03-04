export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();
    const user = await User.findById(session.user.id);

    // Return connection status for each platform
    const connections = {
      tiktok: !!user?.socialTokens?.tiktok?.access_token,
      // Add other platforms here as needed
    };

    console.log(connections, "connections I AM IN STATUS JS");

    return NextResponse.json(connections);
  } catch (error) {
    console.error("Error fetching social connections:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
