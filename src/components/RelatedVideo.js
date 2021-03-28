import React from 'react';

export default class RelatedVideo extends React.Component {
    constructor(props) {
        super(props);
        this.state = { showingThumb: true }

        this.handleThumbClick = this.handleThumbClick.bind(this);
    }

    handleThumbClick(event) {
        this.setState((state) => ({
            showingThumb: !state.showingThumb
        }))
    }

    render() {
        let content = <img src={this.props.data.image} onClick={this.handleThumbClick} />
        let videoPreview = this.props.data.video;
        if (this.state.showingThumb == false && videoPreview) {
            if (videoPreview.includes(".jpg") || videoPreview.includes(".png") || videoPreview.includes(".gif") || videoPreview.includes(".jpeg")) {
                content = <img src={videoPreview} onClick={this.handleThumbClick} />
            }
            else {
                content = <video src={videoPreview} onClick={this.handleThumbClick} autoPlay loop />
            }
        }

        return (
            <div className="RelatedVideo">
                {content}
                <span className="related-video-link" onClick={() => this.props.handlePreview(this.props.data)}>View</span>
            </div>
        )
    }
}