import { useNavigate } from 'react-router-dom';

const BackButton = ({ to, text = 'Back' }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(to || -1)}
      style={{ clipPath: 'polygon(0 50%, 15% 0, 100% 0, 100% 100%, 15% 100%)' }}
      className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 pl-10 pr-6 rounded-md transition-all duration-200 cursor-pointer"
    >
      {text}
    </button>
  );
};

export default BackButton;