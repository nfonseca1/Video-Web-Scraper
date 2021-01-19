import React from 'react';
import FormList from './FormList.js';
import VideoList from './VideoList.js';

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {results: []}

        this.addVideoContent = this.addVideoContent.bind(this);
        this.removeVideo = this.removeVideo.bind(this);
    }

    addVideoContent(results) {
        this.setState((state, props) => ({
            results: [...state.results, ...results]
        }))
    }

    removeVideo(url) {
        let idx = 0;
        for (let i = 0; i < this.state.results.length; i++) {
            if (this.state.results[i].url == url) {
                idx = i;
                break;
            }
        }
        let newResults = this.state.results;
        newResults.splice(idx, 1);
        this.setState({
            results: newResults
        })
    }

    render() {
        return (
            <div>
                <h1>Video Web Scraper</h1>

                <FormList addVideoContent={this.addVideoContent}/>
                <VideoList results={this.state.results} removeVideo={this.removeVideo}/>
            </div>
        )
    }
}

export default App;