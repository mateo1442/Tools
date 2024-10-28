javascript:(function(){
    let debugCount = 0;
    function debug(msg) {
        console.log(`[WikiLinker ${debugCount++}] ${msg}`);
    }

    function createWikiLink(word) {
        const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
        return `https://en.wikipedia.org/wiki/${encodeURIComponent(capitalizedWord)}`;
    }

    function isCommonWord(word) {
        const commonWords = new Set([
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
            'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
            'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
            'is', 'are', 'was', 'were', 'will', 'would', 'could', 'should', 'has',
            'have', 'had', 'been', 'may', 'might', 'must', 'can', 'when', 'where',
            'what', 'who', 'which', 'why', 'how', 'its', 'also', 'or', 'if', 'an'
        ]);
        return commonWords.has(word.toLowerCase());
    }

    function shouldLinkWord(word) {
        if (!word || typeof word !== 'string') {
            debug(`Skipping word: ${word} - invalid type`);
            return false;
        }
        
        const trimmed = word.trim();
        if (trimmed.length < 3) {
            debug(`Skipping word: ${word} - too short`);
            return false;
        }
        
        if (trimmed.includes('_') || trimmed.includes('%')) {
            debug(`Skipping word: ${word} - contains special characters`);
            return false;
        }

        if (!(/^[a-zA-Z]+$/.test(trimmed))) {
            debug(`Skipping word: ${word} - contains non-letters`);
            return false;
        }

        if (isCommonWord(trimmed)) {
            debug(`Skipping word: ${word} - common word`);
            return false;
        }

        debug(`Accepting word: ${word}`);
        return true;
    }

    function processTextNode(textNode) {
        const parent = textNode.parentNode;
        debug(`Processing text node: ${textNode.nodeValue.substring(0, 50)}...`);
        
        // Reduced list of skip tags to be less restrictive
        const skipTags = new Set([
            'A', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'TITLE', 'META'
        ]);

        if (skipTags.has(parent.tagName)) {
            debug(`Skipping due to tag: ${parent.tagName}`);
            return;
        }

        if (parent.closest('.reference') || parent.closest('.mw-editsection')) {
            debug('Skipping due to being in reference or edit section');
            return;
        }

        const text = textNode.nodeValue;
        if (!text || !text.trim()) {
            debug('Skipping empty text node');
            return;
        }

        const words = text.split(/(\b[a-zA-Z]+\b|\s+|[^a-zA-Z\s]+)/);
        debug(`Found ${words.length} potential words`);
        
        const fragment = document.createDocumentFragment();
        let linksCreated = 0;

        words.forEach(word => {
            if (shouldLinkWord(word)) {
                const link = document.createElement('a');
                link.href = createWikiLink(word);
                link.textContent = word;
                link.style.color = '#0645ad';
                link.style.textDecoration = 'none';
                link.target = '_blank';
                link.className = 'wikilinker-added';
                link.addEventListener('mouseover', () => {
                    link.style.textDecoration = 'underline';
                });
                link.addEventListener('mouseout', () => {
                    link.style.textDecoration = 'none';
                });
                fragment.appendChild(link);
                linksCreated++;
                debug(`Created link for: ${word}`);
            } else {
                fragment.appendChild(document.createTextNode(word));
            }
        });

        if (linksCreated > 0) {
            parent.replaceChild(fragment, textNode);
            debug(`Replaced node with ${linksCreated} links`);
        }
    }

    function walkTextNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            processTextNode(node);
            return;
        }
        
        const children = Array.from(node.childNodes);
        debug(`Walking through ${children.length} child nodes`);
        children.forEach(walkTextNodes);
    }

    debug('Starting Wikipedia Auto-Linker');

    // Try to find the content more aggressively
    const article = document.querySelector('.mw-parser-output') || 
                   document.querySelector('#mw-content-text') || 
                   document.querySelector('.mw-body-content') || 
                   document.querySelector('#bodyContent') ||
                   document.querySelector('article') ||
                   document.body; // Fallback to entire body if nothing else found

    if (article) {
        debug(`Found content container: ${article.className || article.id || article.tagName}`);
        
        // Remove old links first
        const oldLinks = document.querySelectorAll('.wikilinker-added');
        oldLinks.forEach(link => {
            const text = document.createTextNode(link.textContent);
            link.parentNode.replaceChild(text, link);
        });
        debug(`Removed ${oldLinks.length} existing links`);

        walkTextNodes(article);
        
        const totalLinks = document.querySelectorAll('.wikilinker-added').length;
        debug(`Processing complete! Added ${totalLinks} links`);
        alert(`Wikipedia Auto-Linker: Added ${totalLinks} new links to the page! Check console (F12) for details.`);
    } else {
        debug('Could not find Wikipedia article content');
        alert('Wikipedia Auto-Linker: Could not find Wikipedia article content on this page.');
    }
})();