import { jest } from '@jest/globals';

// Mock the Supabase client
const single = jest.fn();
const eq = jest.fn(() => ({ single }));
const select = jest.fn(() => ({ eq }));
const from = jest.fn(() => ({ select }));

jest.doMock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from,
  })),
}));

describe('fetchUserRole', () => {
  let fetchUserRole;

  beforeEach(async () => {
    const module = await import('../app/routes/auth.js');
    fetchUserRole = module.fetchUserRole;
    jest.clearAllMocks();
  });

  it('should return user data for a valid user ID', async () => {
    const user = { id: 'valid-user-id' };
    const expectedData = { role: 'recruiter', first_name: 'John', last_name: 'Doe' };

    // Configure the mock to return the expected data
    single.mockResolvedValue({ data: expectedData, error: null });

    const result = await fetchUserRole(user);

    expect(result).toEqual(expectedData);
    expect(from).toHaveBeenCalledWith('profiles');
    expect(select).toHaveBeenCalledWith('role, first_name, last_name');
    expect(eq).toHaveBeenCalledWith('id', user.id);
  });

  it('should return null for an invalid user ID', async () => {
    const user = { id: 'invalid-user-id' };

    // Configure the mock to return an error
    single.mockResolvedValue({ data: null, error: { message: 'User not found' } });

    const result = await fetchUserRole(user);

    expect(result).toBeNull();
    expect(from).toHaveBeenCalledWith('profiles');
    expect(select).toHaveBeenCalledWith('role, first_name, last_name');
    expect(eq).toHaveBeenCalledWith('id', user.id);
  });

  it('should return null if user is null or has no id', async () => {
    expect(await fetchUserRole(null)).toBeNull();
    expect(await fetchUserRole({})).toBeNull();
  });
});
