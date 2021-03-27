import React from 'react';

export default class Preview extends React.Component {
    constructor(props) {
        super(props);
        this.handleBoxClick = this.handleBoxClick.bind(this);
    }

    handleBoxClick(e) {
        e.stopPropagation();
    }

    render() {
        let previewContent = <img src={this.props.data.image} />
        if (this.props.data.video) {
            previewContent = <video src={this.props.data.video} autoPlay loop />
        }

        return (
            <div className="Preview" onClick={this.props.clearPreview}>
                <div className="box" onClick={this.handleBoxClick}>
                    <div className="container">
                        <h2>{this.props.data.title}</h2>
                        {previewContent}
                        <div className="preview-options">
                            <a href={this.props.data.link}>Go To Link</a>
                            <span onClick={() => this.props.searchForVideo(this.props.data)}>Search For Video</span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}