import Icon from '../ui/Icon';

const CATEGORY_ICONS = {
  'Royalty & Payments': 'wallet',
  'ISBN & Metadata Issues': 'hash',
  'Printing & Quality': 'printer',
  'Distribution & Availability': 'truck',
  'Book Status & Production Updates': 'layers',
  'General Inquiry': 'help',
};

export default function CategoryLabel({ category }) {
  return (
    <span className="category">
      <Icon name={CATEGORY_ICONS[category] ?? 'help'} size={15} />
      {category}
    </span>
  );
}
