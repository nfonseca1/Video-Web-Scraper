import React from 'react';
import FormList from './FormList.js';
import VideoList from './VideoList.js';
import Preview from './Preview.js';
import { v4 as uuidv4 } from 'uuid';

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = { results: [], preview: null, appendedSearch: null }

        this.addVideoContent = this.addVideoContent.bind(this);
        this.removeVideo = this.removeVideo.bind(this);
        this.handlePreview = this.handlePreview.bind(this);
        this.clearPreview = this.clearPreview.bind(this);
        this.searchForVideo = this.searchForVideo.bind(this);
        this.clearAppended = this.clearAppended.bind(this);
    }

    addVideoContent(results) {
        results.map(r => r.uuid = uuidv4())
        this.setState((state, props) => ({
            results: [...state.results, ...results]
        }))
    }

    removeVideo(uuid) {
        let newResults = this.state.results.filter(r => r.uuid !== uuid);
        this.setState({ results: newResults });
    }

    handlePreview(data) {
        this.setState({
            preview: <Preview data={data} clearPreview={this.clearPreview} searchForVideo={this.searchForVideo} />
        })
    }

    clearPreview() {
        this.setState({
            preview: null
        })
    }

    searchForVideo(data) {
        this.setState((state) => ({
            appendedSearch: data,
            preview: null
        }))
    }

    clearAppended() {
        this.setState({
            appendedSearch: null
        })
    }

    render() {
        return (
            <div>
                <h1>Video Web Scraper</h1>

                <FormList addVideoContent={this.addVideoContent} appendedSearch={this.state.appendedSearch} clearAppended={this.clearAppended} />
                <VideoList results={this.state.results} removeVideo={this.removeVideo} handlePreview={this.handlePreview} />
                {this.state.preview}
            </div>
        )
    }
}

export default App;