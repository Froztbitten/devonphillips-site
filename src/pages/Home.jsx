import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="w-full flex flex-col items-center justify-center text-white p-4">
      <h1 className="text-5xl font-bold mb-4">Devon Phillips</h1>
      <p className="text-xl mb-8">Full-Stack Developer</p>
      <div className="flex">
        <a href="https://github.com/Froztbitten" target="_blank" rel="noopener noreferrer" className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded inline-flex items-center transition-colors">
          <svg className="fill-current w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <title>GitHub</title>
            <path d="M10 0a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.64-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.72c0 .27.18.58.69.48A10 10 0 0 0 10 0z" />
          </svg>
          <span>GitHub</span>
        </a>
      </div>
      <div className="mt-12 text-center">
        <h2 className="text-3xl font-bold mb-4">Projects</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/smash" className="text-lg border border-white rounded px-4 py-2 hover:bg-white hover:text-gray-900 transition-colors">
            Smash Tools
          </Link>
          <a href="https://scapemate.net/" target="_blank" rel="noopener noreferrer" className="text-lg border border-white rounded px-4 py-2 hover:bg-white hover:text-gray-900 transition-colors">
            Old School Runescape App
          </a>
        </div>
      </div>
    </div>
  );
}

export default Home;
