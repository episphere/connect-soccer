const { Translate } = require('@google-cloud/translate').v2;
const codes = require('./soc2010_6digit_es.json');
const { setHeaders } = require('./common');

const translator = new Translate();

const translate = async (req, res) => {
    setHeaders(res);

    if (req.method === 'OPTIONS') return res.status(200).json({code: 200});
    if (req.method !== 'POST') return res.status(405).json({message: 'Only POST requests are accepted.', code: 405});

    const data = req.body;
    if(Object.keys(data).length === 0 ) return res.status(400).json({message: 'Request body is empty.', code: 400});

    const { title, task, target, n, url } = data;

    if (!target) return res.status(400).json({message: 'Target language is required.', code: 400});
    if (!url) return res.status(400).json({message: 'URL is required.', code: 400});
    if (!title && !task) return res.status(400).json({message: 'Title or Task is required.', code: 400});

    let titleTranslated;
    let taskTranslated;
    
    if (title) {
        const response = await translator.translate(title, target);
        titleTranslated = response[0];
    }

    if (task) {
        const response = await translator.translate(task, target);
        taskTranslated = response[0];
    }

    const soccerInputs = {
        title: titleTranslated,
        task: taskTranslated,
        n: n || 6
    }

    try {
        const results = await soccer(soccerInputs, url);

        let translatedResults = [];
        for (result of results) {
            const codeInfo = codes.find(c => c.code === result.code);
            translatedResults.push(codeInfo);
        }

        return res.status(200).json({translatedResults, code: 200});
    }
    catch (error) {
        return res.status(500).json({message: error.message, code: 500});
    }
}

const soccer = async (inputs, url) => {

    let soccerUrl = new URL(url);
    soccerUrl.search = new URLSearchParams(inputs);

    const response = await fetch(soccerUrl.toString(), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Error running SOCcer: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

module.exports = {
    translate
}