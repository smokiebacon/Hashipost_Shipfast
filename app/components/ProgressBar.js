export default function ProgressBar({ progress, status }) {
  return (
    <div className="w-full">
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      {status && (
        <p className="text-sm text-gray-600 mt-2 text-center">{status}</p>
      )}
    </div>
  );
}
