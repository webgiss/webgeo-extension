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
const checkBingMap = () => document.location.href.startsWith('https://www.bing.com/') || document.location.href.startsWith('https://bing.com/')
const checkGeoportail = () => document.location.href.startsWith('https://www.geoportail.gouv.fr/') || document.location.href.startsWith('https://geoportail.gouv.fr/')
const checkBlitzortung = () => document.location.href.startsWith('https://map.blitzortung.org/')
const checkNullschool = () => document.location.href.startsWith('https://earth.nullschool.net/') || document.location.href.startsWith('https://classic.nullschool.net/')
const checkWindy = () => document.location.href.startsWith('https://www.windy.com/') || document.location.href.startsWith('https://windy.com/')

if (checkGoogle()) {
    registerDomNodeInsertedUnique(() => document.querySelectorAll('[data-ogsr-up]'), (panel) => {
        const firstLink = panel?.children?.[0]?.children?.[0];
        if (firstLink) {
            createElementExtended('a', {
                attributes: {
                    href: '#'
                },
                classnames: [...firstLink.classList, 'webgeo'],
                children: [
                    createElementExtended('img', {
                        attributes: {
                            src: 'https://webgiss.github.io/webgeo/earth-32.png',
                            width: '32',
                            height: '32',
                        }
                    })
                ],
                nextSibling: firstLink,
                onCreated: (link) => {
                    registerClickListener(link, () => {
                        let googlePosition = document.URL.split('/').filter(part => part.startsWith('@'))[0];
                        if (googlePosition.endsWith('m')) {
                            const [alat, lon, distance] = googlePosition.split(',')
                            const lat = Number.parseFloat(alat.slice(1))
                            const m = Number.parseInt(distance.slice(0, distance.length - 1))
                            const z = Math.log(156543.03392 * Math.cos(lat * Math.PI / 180) * document.body.clientHeight / m) / Math.log(2)
                            googlePosition = `${alat},${lon},${z}z`
                        }
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

    addStyle('.webgeo { padding: 0px !important; }')
    addStyle('.webgeo:hover { text-decoration: none; }')
}

if (checkOpenStreetMap()) {
    const navLink = createElementExtended('li', {
        children: [
            createElementExtended('a', {
                attributes: {
                    href: '#',
                },
                children: [
                    createElementExtended('img', {
                        attributes: {
                            src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAADdgAAA3YBfdWCzAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAJuSURBVDiNlZLLS1RRHMc/9555+B5v1JhK6PigRZrGWFlSUSlRumjjJgPBgnYt2kW7/oHAXEjkItoUlBsLe0guWhiiaeAYWDI+0GEcBx0nnevce+5tMTY+kqDv6nDO9/v9ffl9j8Ie+KEauA1cBkq3rmeAAQWejsDETr7y51ABbg88wuG9g/euiqcZMipTj/oUxN7C0mOpmEvdCbgXgGTaYEvcj9Z6kZIeELl7g6Ug4zDbASuvPulwNQBJAeCDLrTWVspeguoGYLP8Ha7mTpwNrzGLRjDDRxDJQtBaQQ/4hD6phaBf8UM1Du84VT9VRC7J0kHcDb0Un17A5Xakh899yyD5pBvVzAK5BhMVUjUjNaIIHnD4fr2dfx7jykNKbvRxqDKBcKi70ucVGESiy4j5+lRKW1et+OCmCjSS34Je84yDZ8bY+GUSDetEwzqxtQSmNFPbVhRy64a3HT0tKNCk+CHOiXgOag7SGQPFSnMsVUdq09ieBYTbhLUCXMHG7YWO58UdgI1tAyAMz67YAnCGCiG0XyU2gK0C82xO71/bv5DSzKnAR2Jv/t8g1gfwQamDKjtVo7AdmRjnOsmpHSO5WERy+BquuQt/i2UMJiqkZS4fF4uwVGyte21j6pTZ8YWj1yfxeCVa+SrZdUOsOMcRPy6x/ettCLbBxmjXV3guADQYcCW+nzUPZpSpvmyy8lJkp1PlQGWU8GICR6g2NTnYhr3aO6BAewgsARABqcELV2BWW/8c8a9QrOpuE0uRSNtgfcZAHRqG4E3JxmiXAu2jYLAjVxon4ZiEWwo0yUx8lguccWaweG9BzxhM7uT/BkHD6xG17TgoAAAAAElFTkSuQmCC',
                            width: '16',
                            height: '16',
                        },
                        classnames: ['webgeo-icon'],
                    }),
                    createElementExtended('span', {
                        text: 'WebGeo',
                    }),
                ],
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

    addStyle('.webgeo-icon { vertical-align: sub; margin-right: 3px; margin-top: 5px; }')
}

if (checkBingMap()) {
    registerDomNodeInsertedUnique(() => document.querySelectorAll('.top-right.subcontrol-container'), (container) => {
        if (container.querySelectorAll('[aria-label="Pitch Control"]').length === 0) {
            return false
        }
        createElementExtended('div', {
            classnames: ['azure-maps-control-container', 'light'],
            parent: container,
            children: [
                createElementExtended('a', {
                    attributes: {
                        href: '#',
                    },
                    children: [
                        createElementExtended('img', {
                            attributes: {
                                src: 'https://webgiss.github.io/webgeo/earth-32.png',
                                width: '32px',
                                height: '32px',
                            },
                        })
                    ],
                    onCreated: (image) => {
                        registerClickListener(image, () => {
                            const bingPosition = Object.fromEntries(document.URL.split('?')[1].split('&').map(data => data.split('=')))
                            if (bingPosition) {
                                const [lat, lon] = bingPosition.cp.split('%7E')
                                const zoom = Number.parseInt(bingPosition.lvl)
                                openLinkInNewTab(`https://webgiss.github.io/webgeo/#map=${zoom}/${lat}/${lon}`)
                            }
                            return false;
                        })
                    },
                })
            ],
        })
        return true
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
                        children: [
                            createElementExtended('img', {
                                attributes: {
                                    src: 'https://webgiss.github.io/webgeo/earth-16.png',
                                    width: '16',
                                    height: '16',
                                },
                                classnames: ['webgeo-icon'],
                            }),
                            createElementExtended('span', {
                                text: 'Link to WebGeo',
                            }),
                        ],
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

    addStyle('.webgeo-icon { vertical-align: sub; margin-right: 3px; margin-top: 4px; }')
}

if (checkBlitzortung()) {
    registerDomNodeInsertedUnique(() => document.querySelectorAll('#MenuButtonDiv'), (menuBase) => {
        createElementExtended('a', {
            attributes: {
                href: '#',
                style: 'right: 88px;background-image: url(\'https://webgiss.github.io/webgeo/earth-32.png\'); background-repeat: round; border-radius: 50px',
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
                            createElementExtended('img', {
                                attributes: {
                                    src: 'https://webgiss.github.io/webgeo/earth-16.png',
                                    width: '16',
                                    height: '16',
                                },
                                classnames: ['webgeo-icon'],
                            }),
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

    addStyle('.webgeo-icon { margin-right: 0.5em; }')
}

if (checkWindy()) {
    registerDomNodeInsertedUnique(() => [...document.querySelectorAll('#overlay')], (overlay) => {
        const toggleOverlays = overlay.querySelector('[data-do=toggleOverlays]')
        if (!toggleOverlays) {
            return false
        }
        createElementExtended('a', {
            attributes: {
                href: '#',
            },
            children: [
                createElementExtended('img', {
                    attributes: {
                        src: 'https://webgiss.github.io/webgeo/earth-16.png',
                        width: '16',
                        height: '16',
                    },
                    classnames: ['webgeo-icon', 'iconfont', 'notap'],
                }),
                createElementExtended('span', {
                    text: 'WebGeo',
                    classnames: ['menu-text', 'notap'],
                }),
            ],
            nextSibling: toggleOverlays,
            onCreated: (link) => {
                registerClickListener(link, () => {
                    const params = document.URL.split('?')[1].split(',').filter(x => x.indexOf(':') === -1)
                    if (params.length >= 3) {
                        const [lat, lon, zoom] = params.slice(params.length - 3)
                        const url = `https://webgiss.github.io/webgeo/#map=${zoom}/${lat}/${lon}`
                        openLinkInNewTab(url);
                    }
                })
            },
        })
        return true
    })

    addStyle(`#rhpane #overlay a .iconfont.webgeo-icon { width: 24px; height: 24px; margin-right: 0px; margin-left: 1px; margin-top: 0px; margin-bottom: 1px; background-color: #fff; padding: 4px; }`)
}

console.log('webgeo extension - content.js executed')
