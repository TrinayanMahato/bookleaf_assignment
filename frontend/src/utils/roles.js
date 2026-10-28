export const homeFor = (role) => (role === 'admin' ? '/admin/tickets' : '/author/books');
export const loginFor = (role) => (role === 'admin' ? '/admin/login' : '/login');
