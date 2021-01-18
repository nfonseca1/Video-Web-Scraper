class FormList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            forms: [<Form addVideoContent={this.props.addVideoContent} key={1}/>]
        }
        this.handleAddForm = this.handleAddForm.bind(this);
    }

    handleAddForm(event) {
        this.setState((state) => ({
            forms: [...state.forms, <Form addVideoContent={this.props.addVideoContent} key={this.state.forms.length}/>]
        }))
    }

    render() {
        return (
            <div className="FormList">
                {this.state.forms}
                <button className="add-new-form-btn" onClick={this.handleAddForm}>Add Search</button>
            </div>
        )
    }
}