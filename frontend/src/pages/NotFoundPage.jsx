import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <div>
        <div className="code">404</div>
        <h1>Page not found</h1>
        <p>The page you were looking for doesn't exist or has moved.</p>
        <Link to="/" className="btn btn-primary"><Icon name="arrowLeft" size={15} /> Back to home</Link>
      </div>
    </div>
  );
}
