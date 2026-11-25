import { type FC } from 'react';
import { Navigate } from 'react-router-dom';
import type { User } from '../../../types/auth';

/** Legacy tab links now lead users to the appropriate seller application flow. */
const SellerTab: FC<{ user: User }> = ({ user }) => (
  <Navigate
    to={user.role === 'seller' ? '/seller/overview' : user.role === 'customer' ? '/seller-application' : '/dashboard'}
    replace
  />
);

export default SellerTab;
