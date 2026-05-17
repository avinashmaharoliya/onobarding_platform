const StatusBadge = ({ status }) => {
  let colorClass = 'bg-gray-100 text-gray-800 border-gray-200';
  
  if (status === 'Approved') colorClass = 'bg-green-50 text-green-700 border-green-200';
  else if (status === 'Rejected') colorClass = 'bg-red-50 text-red-700 border-red-200';
  else if (status === 'Pending') colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
  else if (status === 'Documents Submitted') colorClass = 'bg-blue-50 text-blue-700 border-blue-200';

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${colorClass}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
