const ProgressBar = ({ progress }) => {
  return (
    <div className="w-full bg-teal-100 rounded-full h-3 overflow-hidden shadow-inner">
      <div 
        className="bg-gradient-to-r from-teal-600 to-cyan-600 h-3 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-teal-500/50"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default ProgressBar;
