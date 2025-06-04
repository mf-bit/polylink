import { cookies, SearchInput, Post, Conversation, Textarea } from './utils.js';

// Handle the autoresize textareas
const postInputEls = document.querySelectorAll("textarea");
postInputEls.forEach((postInputEl) => new Textarea(postInputEl));

// Creating the conversation objects
let conversations = document.querySelectorAll('.conversation');
conversations.forEach(con => new Conversation(con));

// Make the input used to search user dynamic
new SearchInput(document.querySelector('.search-user-input'));

/* We suppose that the cytoscape.min.js file is already import on the template */

const dataEnpoint = document.querySelector('.feed.relationship-graph').attributes.dataUrl.value;
fetch(dataEnpoint, {
    method: 'get',
    headers: {
        'X-CSRFToken': cookies.csrftoken,
    }
})
    .then(response => response.json())
    .then(data => {

        // Ignore duplicated edges
        const uniqueEdges = {};
        const filteredEdges = data.edges.filter(edge => {
            const key = `${edge.data.source}-${edge.data.target}`;
            if (!uniqueEdges[key]) {
                uniqueEdges[key] = true;
                return true;
            }
            return false; // Duplicate edge found, ignored
        });

        // Replaces the former edges with the filtered ones
        data.edges = filteredEdges;

        const cy = cytoscape({
            container: document.querySelector('.feed.relationship-graph'),
            elements: data,
            layout: { name: 'cose' },
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': 'transparent',
                        'label': 'data(label)',
                        'background-image': 'data(image)',
                        'background-fit': 'cover',
                        'width': '15',
                        'height': '15',
                        'font-size': '4px',
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': '0.5px',
                        'line-color': '#bab7ec',
                        'target-arrow-shape': 'triangle',
                        'target-arrow-color': '#6c5ce7',
                        'arrow-scale': '0.3',
                        'curve-style': 'bezier',
                    }
                }
            ]
        });
    })
    .catch(error => console.log(error));

