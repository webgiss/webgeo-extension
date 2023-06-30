console.log('webgeo extension - content.js loaded')

/**
 * A promise that is resolved when the html DOM is ready. 
 * Should be part of any browser, but is not.
 * 
 * @type {Promise<void>} A promise that is resolved when the html DOM is ready
 */
const readyPromise = new Promise((resolve, reject) => {
    if (document.readyState === 'complete' || (document.readyState !== 'loading' && !document.documentElement.doScroll)) {
        setTimeout(() => resolve(), 1);
    } else {
        const onContentLoaded = () => {
            resolve();
            document.removeEventListener('DOMContentLoaded', onContentLoaded, false);
        }
        document.addEventListener('DOMContentLoaded', onContentLoaded, false);
    }
})

/**
 * Add a new css string to the page
 * 
 * @param {string} styleText The CSS string to pass
 * @returns {void}
 */
const addStyle = (() => {
    let styleElement = null;
    let styleContent = null;

    /**
     * Add a new css string to the page
     * 
     * @param {string} styleText The CSS string to pass
     * @returns {void}
     */
    return (styleText) => {
        if (styleElement === null) {
            styleElement = document.createElement('style');
            styleContent = "";
            readyPromise.then(() => {
                document.head.appendChild(styleElement);
            })
        } else {
            styleContent += "\n";
        }

        styleContent += styleText;
        styleElement.textContent = styleContent;
    };
})();

/**
 * Wrap addEventListener and removeEventListener using a pattern where the unregister function is returned
 * @param {EventTarget} eventTarget The object on which to register the event
 * @param {string} eventType The event type
 * @param {EventListenerOrEventListenerObject} callback The callback to call when the event is triggered
 * @param {boolean|AddEventListenerOptions=} options The options to pass to addEventListener
 */
const registerEventListener = (eventTarget, eventType, callback, options) => {
    if (eventTarget.addEventListener) {
        eventTarget.addEventListener(eventType, callback, options);
    }
    return () => {
        if (eventTarget.removeEventListener) {
            eventTarget.removeEventListener(eventType, callback, options);
        }
    }
}

/**
 * Wrap addEventListener and removeEventListener using a pattern where the unregister function is returned for click events
 * @param {EventTarget} eventTarget The object on which to register the event
 * @param {EventListenerOrEventListenerObject} callback The callback to call when the event is triggered
 * @param {boolean|AddEventListenerOptions=} options The options to pass to addEventListener
 * @returns 
 */
const registerClickListener = (eventTarget, callback, options) => {
    return registerEventListener(eventTarget, 'click', (e) => {
        e.preventDefault()
        const result = callback(e)
        if (result === false) {
            return false
        }
        return true
    }, options);
}

/**
 * Add a DOMNodeInserted on the document. 
 * Handle the fact that the callback can't be called while aleady being called (no stackoverflow). 
 * Use the register pattern thus return the unregister function as a result
 * @param {EventListener} callback 
 * @return {()=>{}} The unregister function
 */
const registerDomNodeInserted = (callback) => {
    let nodeChangeInProgress = false

    /** @type{EventListener} */
    const onNodeChanged = (e) => {
        if (!nodeChangeInProgress) {
            nodeChangeInProgress = true
            callback(e)
            nodeChangeInProgress = false
        }

    }
    document.documentElement.addEventListener('DOMNodeInserted', onNodeChanged, false);
    onNodeChanged()
    return () => {
        document.documentElement.removeEventListener('DOMNodeInserted', onNodeChanged, false);
    }
}

/**
 * Add a DOMNodeInserted on the document. 
 * Handle the fact that the callback can't be called while aleady being called (no stackoverflow). 
 * Use the register pattern thus return the unregister function as a result
 * 
 * Ensure that when an element matching the query elementProvider, the callback is called with the element 
 * exactly once for each element
 * @param {()=>[HTMLElement]} elementProvider 
 * @param {(element: HTMLElement)=>{}} callback 
 */
const registerDomNodeInsertedUnique = (elementProvider, callback) => {
    const domNodesHandled = new Set()

    return registerDomNodeInserted(() => {
        for (let element of elementProvider()) {
            if (!domNodesHandled.has(element)) {
                domNodesHandled.add(element)
                const result = callback(element)
                if (result === false) {
                    domNodesHandled.delete(element)
                }
            }
        }
    })
}

/**
 * Create a new element, and add some properties to it
 * 
 * @param {string} name The name of the element to create
 * @param {object} params The parameters to tweek the new element
 * @param {object.<string, string>} params.attributes The propeties of the new element
 * @param {string} params.text The textContent of the new element
 * @param {HTMLElement[]} params.children The children of the new element
 * @param {HTMLElement} params.parent The parent of the new element
 * @param {string[]} params.classnames The classnames of the new element
 * @param {string} params.id The classnames of the new element
 * @param {HTMLElement} params.prevSibling The previous sibling of the new element (to insert after)
 * @param {HTMLElement} params.nextSibling The next sibling of the new element (to insert before)
 * @param {(element:HTMLElement)=>{}} params.onCreated called when the element is fully created
 * @returns {HTMLElement} The created element
 */
const createElementExtended = (name, params) => {
    /** @type{HTMLElement} */
    const element = document.createElement(name)
    if (!params) {
        params = {}
    }
    const { attributes, text, children, parent, classnames, id, prevSibling, nextSibling, onCreated } = params
    if (attributes) {
        for (let attributeName in attributes) {
            element.setAttribute(attributeName, attributes[attributeName])
        }
    }
    if (text) {
        element.textContent = text;
    }
    if (children) {
        for (let child of children) {
            element.appendChild(child)
        }
    }
    if (parent) {
        parent.appendChild(element)
    }
    if (classnames) {
        for (let classname of classnames) {
            element.classList.add(classname)
        }
    }
    if (id) {
        element.id = id
    }
    if (prevSibling) {
        prevSibling.parentElement.insertBefore(element, prevSibling.nextSibling)
    }
    if (nextSibling) {
        nextSibling.parentElement.insertBefore(element, nextSibling)
    }
    if (onCreated) {
        onCreated(element)
    }
    return element
}

/**
 * Open a link in a new tab
 * @param {string} url 
 */
const openLinkInNewTab = (url) => {
    const link = createElementExtended('a', {
        attributes: {
            href: url,
            target: '_blank',
        },
    })
    link.click();
}

const checkGoogle = () => document.location.host.indexOf('google') >= 0
const checkOpenStreetMap = () => document.location.href.startsWith('https://www.openstreetmap.org/') || document.location.href.startsWith('https://openstreetmap.org/')
const checkGeoportail = () => document.location.href.startsWith('https://www.geoportail.gouv.fr/') || document.location.href.startsWith('https://geoportail.gouv.fr/')
const checkBlitzortung = () => document.location.href.startsWith('https://map.blitzortung.org/')
const checkNullschool = () => document.location.href.startsWith('https://earth.nullschool.net/') || document.location.href.startsWith('https://classic.nullschool.net/')

if (checkGoogle()) {

    registerDomNodeInsertedUnique(() => document.querySelectorAll('[data-ogsr-up]'), (panel) => {
        const firstLink = panel?.children?.[0]?.children?.[0];
        if (firstLink) {
            createElementExtended('a', {
                attributes: {
                    href: '#'
                },
                classnames: [...firstLink.classList, 'webgeo'],
                text: 'W',
                nextSibling: firstLink,
                onCreated: (link) => {
                    registerClickListener(link, () => {
                        const googlePosition = document.URL.split('/').filter(part => part.startsWith('@'))[0];
                        if (googlePosition) {
                            openLinkInNewTab(`https://webgiss.github.io/webgeo/#google=${googlePosition}`)
                        }
                        return false;
                    })
                }
            })

            return true
        }
        return false
    })


    addStyle('.webgeo { background-color: #fff; border-radius: 50px; padding: 9px !important; border: 1px solid #ccc; font-weight: bold; color: }')
    addStyle('.webgeo:hover { text-decoration: none; border: 1px solid #888; }')
}

if (checkOpenStreetMap()) {
    const navLink = createElementExtended('li', {
        children: [
            createElementExtended('a', {
                attributes: {
                    href: '#',
                },
                text: 'WebGeo',
                classnames: ['nav-link'],
                onCreated: (link) => {
                    registerClickListener(link, () => {
                        const urlArgs = document.URL.split('#')[1];
                        let osmPosition = null;
                        if (urlArgs) {
                            osmPosition = urlArgs.split('&').filter(part => part.startsWith('map='));
                        }
                        if (osmPosition) {
                            openLinkInNewTab(`https://webgiss.github.io/webgeo/#${osmPosition}`);
                            return true;
                        }
                        return false;
                    }, false)
                },
            })
        ],
    })

    registerDomNodeInsertedUnique(() => document.querySelectorAll('nav.secondary'), (panel) => {
        const subpanel = panel.children[0];
        const firstLink = subpanel.children[0];
        if (firstLink) {
            const className = firstLink.className;
            navLink.className = `${className} webgeo`;
            subpanel.insertBefore(navLink, firstLink);

            return;
        }
    })
}

if (checkGeoportail()) {
    registerDomNodeInsertedUnique(() => document.querySelectorAll('#reverse-geocoding-coords'), (coords) => {
        const parent = coords?.parentElement;
        if (parent) {
            createElementExtended('div', {
                id: 'reverse-geocoding-link-to-webgeo',
                parent: parent,
                children: [
                    createElementExtended('a', {
                        attributes: {
                            href: '#'
                        },
                        text: 'Link to WebGeo',
                        classnames: ['nav-link'],
                        onCreated: (link) => {
                            registerClickListener(link, () => {
                                const coords = document.querySelectorAll('#reverse-geocoding-coords')[0]
                                if (coords) {
                                    const text = coords.textContent;
                                    const [lat, lon] = text.split(',').map((str) => str.replace(' ', ''))
                                    const element = document.querySelector('#numeric-scale')
                                    element.dispatchEvent(new MouseEvent('mouseover'))
                                    const zoom = element?.getAttribute('title')?.split('\n')?.filter(x => x.startsWith('Zoom : '))?.map(x => x.split(' : '))?.[0]?.[1] || 18
                                    const osmPosition = `map=${zoom}/${lat}/${lon}`;
                                    openLinkInNewTab(`https://webgiss.github.io/webgeo/#${osmPosition}`)
                                    return true;
                                }
                                return false;
                            }, false)
                        },
                    })
                ],
            })
            return true
        }
        return false
    })

}

if (checkBlitzortung()) {
    registerDomNodeInsertedUnique(() => document.querySelectorAll('#MenuButtonDiv'), (menuBase) => {
        createElementExtended('a', {
            attributes: {
                href: '#',
                style: 'right: 88px;background-image: url(\'https://github.com/webgiss/webgeo/raw/master/res/earth-32.png\'); background-repeat: round; border-radius: 50px',
            },
            parent: menuBase.parentElement,
            classnames: ['MenuButtonDiv'],
            onCreated: (element) => {
                registerClickListener(element, () => {
                    const params = location.hash.substring(1).split('/')
                    if (params.length > 0) {
                        const [zoom, lat, lon] = params.map(x => Number(x))
                        const osmPosition = `map=${zoom + 1}/${lat}/${lon}`;
                        openLinkInNewTab(`https://webgiss.github.io/webgeo/#${osmPosition}`)
                    }
                    return true;
                }, false);
            }
        })
    })
}

if (checkNullschool()) {
    const title = createElementExtended('h1', {
        children: [
            createElementExtended('a', {
                attributes: {
                    href: '#'
                },
                classnames: ['nav-link'],
                children: [
                    createElementExtended('button', {
                        attributes: {
                            'data-name': 'webgeo',
                            'aria-controls': 'menu',
                            'aria-labelledby': 'webgeo webgeo-tt',
                            'data-tooltip': 'webgeo-tt',
                            'title': 'Go to webgeo',
                            'aria-expanded': 'true',
                        },
                        classnames: ['card', 'no-touch-tt'],
                        children: [
                            createElementExtended('span', {
                                text: 'WebGeo',
                            }),
                        ],
                    }),
                ],
                onCreated: (link) => {
                    registerClickListener(link, () => {
                        const locs = location.hash.split('/').filter(x => x.startsWith('loc='));
                        if (locs.length > 0) {
                            const loc = locs[0].substring('loc='.length)
                            const [lon, lat] = loc.split(',').map(x => Number(x))
                            const osmPosition = `map=${12}/${lat}/${lon}`
                            openLinkInNewTab(`https://webgiss.github.io/webgeo/#${osmPosition}`)
                        }
                        return true
                    })
                }
            })
        ],
    })

    registerDomNodeInsertedUnique(() => document.querySelectorAll('h1'), (titleBase) => {
        const parent = titleBase.parentElement;
        if (parent) {
            parent.append(title);
            return true
        }
        return false
    })
}

console.log('webgeo extension - content.js executed')
