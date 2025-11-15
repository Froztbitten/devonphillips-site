import { NavLink, Link, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

const Navbar = () => {
  const location = useLocation();
  const [sliderStyle, setSliderStyle] = useState({});
  const navRef = useRef(null);
  const linkRefs = {
    '/': useRef(null),
    '/smash': useRef(null),
  };

  useEffect(() => {
    const activePath = location.pathname.startsWith('/smash') ? '/smash' : '/';
    const activeLinkRef = linkRefs[activePath];

    if (activeLinkRef && activeLinkRef.current && navRef.current) {
      const linkRect = activeLinkRef.current.getBoundingClientRect();
      const navRect = navRef.current.getBoundingClientRect();
      setSliderStyle({
        left: `${linkRect.left - navRect.left}px`,
        width: `${linkRect.width}px`,
      });
    }
  }, [location.pathname]);

  const getLinkClass = (path) => {
    const isActive = path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);

    return `relative px-4 py-2 text-lg font-medium transition-colors duration-300 ${
      isActive
        ? 'text-white'
        : 'text-gray-300 hover:text-white'
    }`;
  };

  return (
    <nav className="bg-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-serif font-bold text-white">
            Devon Phillips
          </Link>
          <div ref={navRef} className="relative flex items-center space-x-4">
            <NavLink to="/" className={getLinkClass('/')} ref={linkRefs['/']}>
              Home
            </NavLink>
            <NavLink to="/smash" className={getLinkClass('/smash')} ref={linkRefs['/smash']}>
              Smash
            </NavLink>
            <span className="nav-slider" style={sliderStyle} />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;