class VideoList extends React.Component {
    render() {
        let jsx = this.props.results.map(result => {
            return <Video data={result} key={result.url}/>
        })
        return (
            <div className="VideoList">
                {jsx}
            </div>
        )
    }
}