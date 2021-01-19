import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import Form from './Form.js';

class FormList extends React.Component {
    constructor(props) {
        super(props);
        let uuid = uuidv4();
        
        this.handleAddForm = this.handleAddForm.bind(this);
        this.handleRemoveForm = this.handleRemoveForm.bind(this);

        this.state = {
            forms: [{
                uuid: uuid,
                jsx: <Form addVideoContent={this.props.addVideoContent} handleRemoveForm={this.handleRemoveForm} key={uuid} uuid={uuid}/>
            }]
        }
    }

    handleAddForm() {
        let uuid = uuidv4();
        this.setState((state) => ({
            forms: [...state.forms, {
                                    uuid: uuid,
                                    jsx: <Form 
                                        addVideoContent={this.props.addVideoContent} 
                                        handleRemoveForm={this.handleRemoveForm} 
                                        key={uuid}
                                        uuid={uuid}
                                    />}]
        }))
    }

    handleRemoveForm(uuid) {
        let removeIdx = 0;
        console.log('state: ', this.state);
        let forms = this.state.forms;
        
        for (let i = 0; i < forms.length; i++) {
            if (forms[i].uuid === uuid) {
                removeIdx = i;
                break;
            }
        }

        forms.splice(removeIdx, 1);
        this.setState({
            forms: forms
        })
    }

    render() {
        return (
            <div className="FormList">
                {this.state.forms.map(f => f.jsx)}
                <button className="add-new-form-btn" onClick={this.handleAddForm}>Add Search</button>
            </div>
        )
    }
}

export default FormList;