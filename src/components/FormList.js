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
                jsx: <Form addVideoContent={this.props.addVideoContent} handleRemoveForm={this.handleRemoveForm} key={uuid} uuid={uuid} />,
                title: '',
                website: ''
            }],
            batchForms: this.props.batchForms
        }
    }

    handleAddForm(data) {
        let website = data?.link;
        if (website) {
            let postHTTP = website.split("://")[1] || website;
            let postWWW = postHTTP.split("www.")[1] || postHTTP;
            let preSlash = postWWW.split("/")[0];
            website = preSlash;
        }

        let uuid = uuidv4();
        this.setState((state) => ({
            forms: [...state.forms, {
                uuid: uuid,
                jsx: <Form
                    addVideoContent={this.props.addVideoContent}
                    handleRemoveForm={this.handleRemoveForm}
                    key={uuid}
                    uuid={uuid}
                    searchTerm={data?.title}
                    website={website}
                />,
                title: data?.title || '',
                link: data?.link || ''
            }]
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

        this.props.clearAppended();
    }

    componentDidUpdate() {
        let forms = this.state.forms;
        let pas = this.props.appendedSearch;
        if (!(pas?.title == forms[forms.length - 1]?.title && pas?.link == forms[forms.length - 1]?.link) && pas?.title) {
            this.handleAddForm(pas);
        }

        let batch = this.props.batchForms;
        let lastUUID = batch[batch.length - 1]?.uuid;
        let matchingUUID = this.state.forms.find(form => form.uuid === lastUUID);
        if (lastUUID && !matchingUUID) {
            let batchForms = this.props.batchForms.map((form) => {
                return {
                    uuid: form.uuid,
                    jsx: <Form
                        addVideoContent={this.props.addVideoContent}
                        handleRemoveForm={this.handleRemoveForm}
                        key={form.uuid}
                        uuid={form.uuid}
                        searchTerm={form.search}
                        duration={form.duration}
                        count={form.count}
                        website={form.website}
                    />,
                    title: '',
                    link: ''
                }
            })

            this.setState((state) => ({
                forms: [...state.forms, ...batchForms]
            }))
        }
    }

    render() {

        return (
            <div className="FormList">
                {this.state.forms.map(f => f.jsx)}
                <button className="add-new-form-btn" onClick={this.handleAddForm}>Add Search</button>
                <button className="batch-add-btn" onClick={this.props.handleAddBatch}>Batch Search</button>
            </div>
        )
    }
}

export default FormList;