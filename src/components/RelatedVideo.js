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
        if (this.state.showingThumb == false) {
            content = <video src={this.props.data.video} onClick={this.handleThumbClick} autoPlay loop />
        }

        return (
            <div className="RelatedVideo">
                {content}
                <a className="related-video-link" href={this.props.data.link}>Go To Link</a>
            </div>
        )
    }
}