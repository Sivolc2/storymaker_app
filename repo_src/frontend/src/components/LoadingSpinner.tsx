import './LoadingSpinner.css';

function LoadingSpinner() {
  return (
    <div className="loading-spinner-overlay">
      <div className="loading-spinner"></div>
      <p>Loading, please wait...</p>
    </div>
  );
}

export default LoadingSpinner; 