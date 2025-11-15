import React, { useState, useEffect } from 'react';
import BackButton from '../../components/BackButton';
import { useClickAway } from '../../hooks/useClickAway';

const CharacterRandomizer = () => {
    const [characters, setCharacters] = useState([]);
    const [weights, setWeights] = useState({});
    const [selectedChar, setSelectedChar] = useState(null);
    const [activeSlider, setActiveSlider] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Hook to close the slider popup when clicking outside
    const popupRef = useClickAway(() => {
        setActiveSlider(null);
    });

    useEffect(() => {
        let isCancelled = false;

        const fetchCharacters = async () => {
            try {
                // Query the category for head icons to get the correct file names and URLs
                const response = await fetch('https://www.ssbwiki.com/api.php?action=query&generator=categorymembers&gcmtitle=Category:Head_icons_(SSBU)&gcmlimit=500&prop=imageinfo&iiprop=url&format=json&origin=*');
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.statusText}`);
                }
                const data = await response.json();

                // Add a check to ensure the expected data structure is present
                if (!data || !data.query || !data.query.pages) {
                    // Log the actual response for easier debugging
                    console.error("Unexpected API response:", data);
                    throw new Error('Invalid data format from API');
                }

                const characterMap = new Map();
                Object.values(data.query.pages).forEach(page => {
                    // Only process images that are the "Website" version and have a valid URL.
                    if (page.imageinfo && page.imageinfo[0] && page.imageinfo[0].url && page.title.includes('Website')) {
                        // Normalize character name from the file title, removing "Website", "(Female)", etc.
                        const name = page.title
                            .replace('File:', '')
                            .replace('HeadSSBUWebsite.png', '')
                            .replace(/([A-Z(&])/g, ' $1').trim();

                        if (!characterMap.has(name)) {
                            characterMap.set(name, { name, image: page.imageinfo[0].url });
                        }
                    }
                });

                const characterData = Array.from(characterMap.values());

                if (isCancelled) return;

                // Filter out Echo fighters if desired, or handle duplicates. For now, we keep all.
                // A simple sort by name
                characterData.sort((a, b) => a.name.localeCompare(b.name));

                setCharacters(characterData);

                // Initialize weights
                const initialWeights = {};
                characterData.forEach(char => {
                    initialWeights[char.name] = 100; // Default weight is 100%
                });
                setWeights(initialWeights);

            } catch (err) {
                setError('Failed to fetch character data. Please try again later.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchCharacters();

        return () => {
            isCancelled = true;
        };
    }, []); // Empty dependency array ensures this runs only once on mount

    const handleWeightChange = (charName, value) => {
        setWeights(prev => ({ ...prev, [charName]: parseFloat(value) }));
    };

    const handleRandomize = () => {
        const weightedList = [];
        for (const char of characters) {
            const weight = weights[char.name];
            if (weight > 0) {
                // The higher the weight, the more entries in the list
                const entries = Math.ceil(weight);
                for (let i = 0; i < entries; i++) {
                    weightedList.push(char);
                }
            }
        }

        if (weightedList.length === 0) {
            setSelectedChar({ name: "No character has a weight > 0!", image: '' });
            return;
        }

        const randomIndex = Math.floor(Math.random() * weightedList.length);
        setSelectedChar(weightedList[randomIndex]);
    };

    const totalWeightReduction = Object.values(weights).reduce(
        (sum, weight) => sum + (100 - weight),
        0
    );

    if (loading) return <div className="text-center text-white">Loading Characters...</div>;
    if (error) return <div className="text-center text-red-400">{error}</div>;

    return (
        <div className="w-full">
            <BackButton to="/smash" text="Back to Smash Tools" />
            <h1 className="text-3xl font-bold mb-6 text-white text-center">Character Randomizer</h1>

            {selectedChar && (
                <div className="mb-8 text-center p-6 bg-gray-800 border border-gray-700 rounded-lg">
                    <h2 className="text-2xl font-bold text-blue-300 mb-4">Your Character Is...</h2>
                    <div className="inline-flex flex-col items-center">
                        {selectedChar.image && <img src={selectedChar.image} alt={selectedChar.name} className="w-32 h-32 rounded-full bg-gray-700 border-4 border-blue-400 mb-2" />}
                        <p className="text-xl font-semibold">{selectedChar.name}</p>
                    </div>
                </div>
            )}

            <div className="text-center mb-8">
                <button onClick={handleRandomize} className="py-3 px-8 rounded-lg font-semibold text-center transition-all duration-200 ease-in-out border-none cursor-pointer bg-blue-500 text-white shadow-[0_4px_6px_-1px_rgba(66,153,225,0.3)] hover:bg-blue-600 hover:shadow-[0_10px_15px_-3px_rgba(66,153,225,0.3)] hover:-translate-y-0.5">
                    Randomize!
                </button>
                <p className="text-sm text-gray-400 mt-4">
                    Total Weight Reduction: <span className="font-bold text-blue-300">{totalWeightReduction.toFixed(0)}%</span>
                </p>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
                {characters.map(char => (
                    <div key={char.name} className="relative" ref={activeSlider === char.name ? popupRef : null}>
                        <button
                            onClick={() => setActiveSlider(activeSlider === char.name ? null : char.name)}
                            className={`relative w-full aspect-square rounded-lg overflow-hidden border-4 transition-all duration-200 ${activeSlider === char.name ? 'border-blue-400' : 'border-gray-600 hover:border-gray-500'}`}
                        >
                            <img src={char.image} alt={char.name} className="w-full h-full object-cover" title={char.name} />
                            {/* Red overlay that fills based on weight */}
                            <div
                                className="absolute bottom-0 left-0 right-0 bg-red-600/70 transition-all duration-200 pointer-events-none"
                                style={{
                                    // Height is based on how far from 100% the weight is.
                                    height: `${100 - weights[char.name]}%`
                                }}
                            ></div>
                            {/* Show percentage in the center of the button if not 100% */}
                            {weights[char.name] < 100 && (
                                <div 
                                    className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg pointer-events-none"
                                    style={{ textShadow: '0px 0px 3px black, 0px 0px 5px black' }}
                                >
                                    {`${weights[char.name]}%`}
                                </div>
                            )}
                        </button>
                        {activeSlider === char.name && (
                            <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-gray-700 rounded-lg shadow-lg w-48">
                                <label htmlFor={char.name + "-slider"} className="block text-xs text-center text-gray-300 mb-2 font-bold">{char.name}</label>
                                <input
                                    id={char.name + "-slider"}
                                    name={char.name}
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    onChange={(e) => handleWeightChange(char.name, e.target.value)}
                                    className="w-full"
                                    value={weights[char.name]}
                                />
                                <div className="text-center text-xs font-mono mt-1">{`${weights[char.name]}%`}</div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CharacterRandomizer;