import { useState, useEffect, type FC, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createStaffAccount, listStaffAccounts, type StaffAccount } from '../services/authApi';

type StaffUser = StaffAccount;

const StaffAddAccountPage: FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);

  const fetchStaffList = async () => {
    try {
      const data = await listStaffAccounts();
      setStaffList(data.staff);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let cancelled = false;
    listStaffAccounts().then((data) => {
      if (!cancelled) setStaffList(data.staff);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      await createStaffAccount({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        confirm_password: password,
        contact_number: contactNumber.trim(),
      });

      setMessage(`Staff account for ${firstName} ${lastName} (${email}) created successfully!`);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setContactNumber('');
      fetchStaffList();
    } catch (err: unknown) {
      const apiErr = err as { message?: string; errors?: Record<string, string> };
      setError(apiErr.message ?? 'Failed to create staff account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Add Staff Account</h1>
      <p>
        <Link to="/">Back to Home</Link> | <Link to="/login">Go to Login</Link> | <Link to="/dashboard">Dashboard</Link>
      </p>

      {message && <p><strong>Success: {message}</strong></p>}
      {error && <p><strong>Error: {error}</strong></p>}

      <form onSubmit={handleSubmit}>
        <p>
          <label>First Name: *</label><br />
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </p>

        <p>
          <label>Last Name: *</label><br />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </p>

        <p>
          <label>Email: *</label><br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </p>

        <p>
          <label>Password: * (min 8 characters)</label><br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </p>

        <p>
          <label>Contact Number (optional):</label><br />
          <input
            type="text"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            placeholder="09XXXXXXXXX"
          />
        </p>

        <p>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Staff Account'}
          </button>
        </p>
      </form>

      <hr />

      <h2>Existing Staff Accounts</h2>
      {staffList.length === 0 ? (
        <p>No staff accounts found.</p>
      ) : (
        <table border={1} cellPadding={6} cellSpacing={0}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Contact Number</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((staff) => (
              <tr key={staff.id}>
                <td>{staff.id}</td>
                <td>{staff.first_name} {staff.last_name}</td>
                <td>{staff.email}</td>
                <td>{staff.contact_number ?? '—'}</td>
                <td>staff</td>
                <td>Yes</td>
                <td>{staff.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StaffAddAccountPage;
