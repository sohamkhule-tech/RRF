export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return Response.json(
        { valid: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    // Decode token (in production, verify JWT properly)
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      return Response.json({ valid: true, user: decoded });
    } catch {
      return Response.json(
        { valid: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    return Response.json(
      { valid: false, message: 'Verification failed' },
      { status: 500 }
    );
  }
}
