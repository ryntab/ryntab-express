import { scan, scanWithQueue } from '@ryntab/wappalyzer-node';
import express from 'express';

const app = express();

app.use(express.json());

app.listen(8080, () => {
    console.log('Server running on port 8080');
});

const ensureFullyQualifiedDomain = (site) => {
    let url;

    try {
        // Check if the site already has a protocol
        url = new URL(site);
    } catch (e) {
        // If not, add http:// as the default protocol
        url = new URL(`http://${site}`);
    }

    return url.href;
};

app.post('/api/scan', async (req, res) => {

    if (!req.body || !req.body.site) {
        res.send({ error: "No site provided in the request body" });
        return;
    }

    let site = req.body.site;
    site = ensureFullyQualifiedDomain(site);

    // Scan the site
    const result = await scanWithQueue(site, {
        target: 'browser'
    });

    res.send({ result });
});