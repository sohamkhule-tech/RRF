// Mock user database - In production, replace with real database
const users = [
  {
    id: 1,
    userId: 'hm001',
    password: 'hm123', // In production, use bcrypt hashed passwords
    role: 'hiring-manager',
    name: 'John Doe',
    email: 'john.doe@company.com',
  },
  {
    id: 2,
    userId: 'pmo001',
    password: 'pmo123',
    role: 'pmo',
    name: 'Priya Sharma',
    email: 'priya.sharma@company.com',
  },
  {
    id: 3,
    userId: 'app001',
    password: 'app123',
    role: 'approver',
    name: 'Sarah Miller',
    email: 'sarah.miller@company.com',
  },
  {
    id: 4,
    userId: 'hr001',
    password: 'hr123',
    role: 'hr',
    name: 'Mike Johnson',
    email: 'mike.johnson@company.com',
  },
];

export async function POST(request) {
  try {
    const { userId, password } = await request.json();

    // Find user
    const user = users.find((u) => u.userId === userId && u.password === password);

    if (!user) {
      return Response.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // In production, generate real JWT token
    const token = Buffer.from(JSON.stringify(userWithoutPassword)).toString('base64');

    return Response.json({
      access_token: token,
      user: userWithoutPassword,
    });
  } catch (error) {
    return Response.json(
      { message: 'Login failed' },
      { status: 500 }
    );
  }
}
