import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/Feedback';

export default function NotFoundPage() {
  return (
    <div className="page">
      <EmptyState title="Page not found" action={<Link to="/" className="btn">Go home</Link>}>
        The page you were looking for doesn't exist.
      </EmptyState>
    </div>
  );
}
