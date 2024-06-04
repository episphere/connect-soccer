const { Translate } = require('@google-cloud/translate').v2;
const { setHeaders } = require('./common');

// translation code files
const es = require('./soc2010_6digit_es.json');

const translator = new Translate();

const soccer = async (req, res) => {
    setHeaders(res);

    if (req.method === 'OPTIONS') return res.status(200).json({ code: 200 });
    if (req.method !== 'POST') return res.status(405).json({ message: 'Only POST requests are accepted.', code: 405 });

    const data = req.body;
    if (!data || Object.keys(data).length === 0) return res.status(400).json({ message: 'Request body is empty.', code: 400 });

    let { title, task, language } = data;

    if (!title && !task) return res.status(400).json({ message: 'Title or Task is required.', code: 400 });

    try {
        
        // Translate title and task if language is provided
        if (language) {
            const translations = await Promise.all([
                title ? translate(title) : Promise.resolve(title),
                task ? translate(task) : Promise.resolve(task)
            ]);
        
            [title, task] = translations;
        }

        // Fetch results from SOCcer API
        let results = await fetchResults(title, task);

        // Translate results if language is Spanish
        if (language && language === 'es') {
            results = findCodes(results, es);
        } else if (language) {
            throw new Error('Unsupported language.');
        }

        return res.status(200).json({ results, code: 200 });
    } catch (error) {
        return res.status(500).json({ message: error.message, code: 500 });
    }
}

/**
 * Fetches results from the SOCcer API based on the given title and task.
 *
 * @param {string} title - The title parameter to be sent to the API.
 * @param {string} task - The task parameter to be sent to the API.
 * @returns {Promise<Object>} A promise that resolves to the JSON response from the API.
 * @throws {Error} Throws an error if the API request fails.
 */
const fetchResults = async (title, task) => {
    try {
        const url = new URL('https://soccer-myconnect.cancer.gov/soccer/code?');
        url.search = new URLSearchParams({ title, task, n: 6 });

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error running SOCcer: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        throw new Error(error.message);
    }
}

/**
 * Translates the given source text to English.
 *
 * @param {string} source - The text to be translated.
 * @returns {Promise<string>} A promise that resolves to the translated text.
 */
const translate = async (source) => {
    const response = await translator.translate(source, "en");
    return response[0];
}

/**
 * Finds matching code information for each result.
 *
 * @param {Array<Object>} results - The array of result objects, each containing a `code` property.
 * @param {Array<Object>} codes - The array of code objects, each containing a `code` property.
 * @returns {Array<Object|undefined>} An array of matched code information objects. If no match is found, `undefined` is added to the array.
 */
const findCodes = (results, codes) => {
    let matches = [];
        
    for (result of results) {
        const codeInfo = codes.find(c => c.code === result.code);
        
        if (codeInfo) {
            matches.push(codeInfo);
        }
    }

    return matches;
}

module.exports = {
    soccer
}