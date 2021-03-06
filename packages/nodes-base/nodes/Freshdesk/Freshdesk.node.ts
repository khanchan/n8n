import {
	IExecuteSingleFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	freshdeskApiRequest,
	validateJSON,
	capitalize
} from './GenericFunctions';

enum Status {
	Open = 2,
	Pending = 3,
	Resolved = 4,
	Closed = 5,
}

enum Priority {
	Low = 1,
	Medium = 2,
	High = 3,
	Urgent = 4
}

enum Source {
	Email = 1,
	Portal = 2,
	Phone = 3,
	Chat = 7,
	Mobihelp = 8,
	FeedbackWidget = 9,
	OutboundEmail = 10,
}

interface ICreateTicketBody {
	name?: string;
	requester_id?: number;
	email?: string;
	facebook_id?: string;
	phone?: string;
	twitter_id?: string;
	unique_external_id?: string;
	subject?: string | null;
	type?: string;
	status: Status;
	priority: Priority;
	description?: string;
	responder_id?: number;
	cc_emails?: [string];
	custom_fields?: IDataObject;
	due_by?: string;
	email_config_id?: number;
	fr_due_by?: string;
	group_id?: number;
	product_id?: number;
	source: Source;
	tags?: [string];
	company_id?: number;
}

export class Freshdesk implements INodeType {

	description: INodeTypeDescription = {
		displayName: 'Freshdesk',
		name: 'freshdesk',
		icon: 'file:freshdesk.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Freshdesk API',
		defaults: {
			name: 'Freshdesk',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'freshdeskApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				required: true,
				options: [
					{
						name: 'Ticket',
						value: 'ticket',
					},
				],
				default: 'ticket',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'ticket',
						]
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new ticket',
					}
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Requester Identification',
				name: 'requester',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'ticket',
						],
						operation: [
							'create'
						]
					},
				},
				options: [
					{
						name: 'Requester Id',
						value: 'requesterId',
						description: `User ID of the requester. For existing contacts, the requester_id can be passed instead of the requester's email.`,
					},
					{
						name: 'Email',
						value: 'email',
						description: `Email address of the requester. If no contact exists with this email address in Freshdesk, it will be added as a new contact.`,
					},
					{
						name: 'Facebook Id',
						value: 'facebookId',
						description: `Facebook ID of the requester. If no contact exists with this facebook_id, then a new contact will be created.`,
					},
					{
						name: 'Phone',
						value: 'phone',
						description: `Phone number of the requester. If no contact exists with this phone number in Freshdesk, it will be added as a new contact. If the phone number is set and the email address is not, then the name attribute is mandatory.`,
					},
					{
						name: 'Twitter Id',
						value: 'twitterId',
						description: `Twitter handle of the requester. If no contact exists with this handle in Freshdesk, it will be added as a new contact.`,
					},
					{
						name: 'Unique External Id',
						value: 'uniqueExternalId',
						description: `External ID of the requester. If no contact exists with this external ID in Freshdesk, they will be added as a new contact.`,
					},
				],
				default: 'requesterId',
				description: 'Requester Identification',
			},
			{
				displayName: 'Value',
				name: 'requesterIdentificationValue',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'ticket',
						],
						operation: [
							'create'
						]
					},
				},
				default: '',
				description: `Value of the identification selected `,
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'ticket',
						],
						operation: [
							'create'
						]
					},
				},
				options: [
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Resolved',
						value: 'resolved',
					},
					{
						name: 'Closed',
						value: 'closed',
					}
				],
				default: 'pending',
				description: 'Status',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'ticket',
						],
						operation: [
							'create'
						]
					},
				},
				options: [
					{
						name: 'Low',
						value: 'low',
					},
					{
						name: 'Medium',
						value: 'medium',
					},
					{
						name: 'High',
						value: 'high',
					},
					{
						name: 'Urgent',
						value: 'urgent',
					}
				],
				default: 'low',
				description: 'Priority',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'ticket',
						],
						operation: [
							'create'
						]
					},
				},
				options: [
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Portal',
						value: 'portal',
					},
					{
						name: 'Phone',
						value: 'phone',
					},
					{
						name: 'Chat',
						value: 'chat',
					},
					{
						name: 'Mobihelp',
						value: 'mobileHelp',
					},
					{
						name: 'Feedback Widget',
						value: 'feedbackWidget',
					},
					{
						name: 'Outbound Email',
						value: 'OutboundEmail',
					}
				],
				default: 'portal',
				description: 'The channel through which the ticket was created.',
			},
			// {
			// 	displayName: 'JSON Parameters',
			// 	name: 'jsonParameters',
			// 	type: 'boolean',
			// 	default: false,
			// 	description: '',
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'ticket'
			// 			],
			// 			operation: [
			// 				'create',
			// 			]
			// 		},
			// 	},
			// },
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'ticket'
						],
						operation: [
							'create'
						],
					},
				},
				options: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: '',
						description: 'Name of the requester',
					},
					{
						displayName: 'Subject',
						name: 'subject',
						type: 'string',
						default: '',
						placeholder: '',
						description: 'Subject of the ticket.',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						default: 'Question',
						description: 'Helps categorize the ticket according to the different kinds of issues your support team deals with.',
						options: [
							{
								name: 'Question',
								value: 'Question'
							},
							{
								name: 'Incident',
								value: 'Incident'
							},
							{
								name: 'Problem',
								value: 'Problem'
							},
							{
								name: 'Feature Request',
								value: 'Feature Request'
							},
							{
								name: 'Refund',
								value: 'Refund'
							},
						]
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						required: false,
						default: '',
						typeOptions: {
							rows: 5,
							alwaysOpenEditWindow: true,
						},
						description: 'HTML content of the ticket.',
					},
					{
						displayName: 'Agent',
						name: 'agent',
						type: 'options',
						required: false,
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getAgents'
						},
						description: 'ID of the agent to whom the ticket has been assigned',
					},
					{
						displayName: 'CC Emails',
						name: 'ccEmails',
						required: false,
						type: 'string',
						default: '',
						description: `separated by , email addresses added in the 'cc' field of the incoming ticket email`,
					},
					{
						displayName: 'Tags',
						name: 'tags',
						required: false,
						type: 'string',
						default: '',
						description: `separated by , tags that have been associated with the ticket`,
					},
					{
						displayName: 'Due By',
						name: 'dueBy',
						required: false,
						type: 'dateTime',
						default: '',
						description: `Timestamp that denotes when the ticket is due to be resolved`,
					},
					{
						displayName: 'Email config Id',
						name: 'emailConfigId',
						type: 'number',
						required: false,
						default: '',
						description: `ID of email config which is used for this ticket. (i.e., support@yourcompany.com/sales@yourcompany.com)
						If product_id is given and email_config_id is not given, product's primary email_config_id will be set`,
					},
					{
						displayName: 'FR Due By',
						name: 'frDueBy',
						type: 'dateTime',
						required: false,
						default: '',
						description: `Timestamp that denotes when the first response is due`,
					},
					{
						displayName: 'Group',
						name: 'group',
						required: false,
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getGroups'
						},
						description: `ID of the group to which the ticket has been assigned. The default value is the ID of the group that is associated with the given email_config_id`,
					},
					{
						displayName: 'Product',
						name: 'product',
						required: false,
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getProducts'
						},
						description: `ID of the product to which the ticket is associated.
						It will be ignored if the email_config_id attribute is set in the request.`,
					},
					{
						displayName: 'Company',
						name: 'company',
						required: false,
						type: 'options',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'getCompanies'
						},
						description: `Company ID of the requester. This attribute can only be set if the Multiple Companies feature is enabled (Estate plan and above)`,
					},
				]
			},
			// {
			// 	displayName: 'Custom Fields',
			// 	name: 'customFieldsUi',
			// 	placeholder: 'Add Custom fields',
			// 	type: 'fixedCollection',
			// 	required: false,
			// 	default: '',
			// 	typeOptions: {
			// 		multipleValues: true,
			// 	},
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'ticket'
			// 			],
			// 			operation: [
			// 				'create'
			// 			],
			// 			jsonParameters: [
			// 				false,
			// 			],
			// 		},
			// 	},
			// 	description: 'Key value pairs containing the names and values of custom fields.',
			// 	options: [
			// 		{
			// 			name: 'customFieldsValues',
			// 			displayName: 'Custom fields',
			// 			values: [
			// 				{
			// 					displayName: 'Key',
			// 					required: false,
			// 					name: 'key',
			// 					type: 'string',
			// 					default: '',
			// 				},
			// 				{
			// 					displayName: 'Value',
			// 					name: 'value',
			// 					type: 'string',
			// 					required: false,
			// 					default: '',
			// 				},
			// 			],
			// 		},
			// 	],
			// },
			// {
			// 	displayName: 'Custom Fields',
			// 	name: 'customFieldsJson',
			// 	type: 'json',
			// 	typeOptions: {
			// 		alwaysOpenEditWindow: true,
			// 	},
			// 	displayOptions: {
			// 		show: {
			// 			resource: [
			// 				'ticket'
			// 			],
			// 			operation: [
			// 				'create'
			// 			],
			// 			jsonParameters: [
			// 				true,
			// 			],
			// 		},
			// 	},
			// 	default: '',
			// 	required: false,
			// 	placeholder: `{
			// 		"gadget":"Cold Welder"
			// 	}`,
			// 	description: 'Key value pairs containing the names and values of custom fields.',
			// },
		]
	};

	methods = {
		loadOptions: {
			// Get all the agents to display them to user so that he can
			// select them easily
			async getAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let agents;
				try {
					agents = await freshdeskApiRequest.call(this, '/agents', 'GET');
				} catch (err) {
					throw new Error(`Freshdesk Error: ${err}`);
				}
				for (const agent of agents) {
					const agentName = agent.contact.name;
					const agentId = agent.id;

					returnData.push({
						name: agentName,
						value: agentId,
					});
				}
				return returnData;
			},

			// Get all the groups to display them to user so that he can
			// select them easily
			async getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let groups;
				try {
					groups = await freshdeskApiRequest.call(this, '/groups', 'GET');
				} catch (err) {
					throw new Error(`Freshdesk Error: ${err}`);
				}
				for (const group of groups) {
					const groupName = group.name;
					const groupId = group.id;

					returnData.push({
						name: groupName,
						value: groupId,
					});
				}
				return returnData;
			},

			// Get all the products to display them to user so that he can
			// select them easily
			async getProducts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let products;
				try {
					products = await freshdeskApiRequest.call(this, '/products', 'GET');
				} catch (err) {
					throw new Error(`Freshdesk Error: ${err}`);
				}
				for (const product of products) {
					const productName = product.name;
					const productId = product.id;

					returnData.push({
						name: productName,
						value: productId,
					});
				}
				return returnData;
			},

			// Get all the companies to display them to user so that he can
			// select them easily
			async getCompanies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let companies;
				try {
					companies = await freshdeskApiRequest.call(this, '/companies', 'GET');
				} catch (err) {
					throw new Error(`Freshdesk Error: ${err}`);
				}
				for (const company of companies) {
					const companyName = company.name;
					const companyId = company.id;

					returnData.push({
						name: companyName,
						value: companyId,
					});
				}
				return returnData;
			},
		},
	};

	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
		const resource = this.getNodeParameter('resource') as string;
		const opeation = this.getNodeParameter('operation') as string;
		let response;

		if (resource === 'ticket') {
			if (opeation === 'create') {
				const requester = this.getNodeParameter('requester') as string;
				const value = this.getNodeParameter('requesterIdentificationValue') as string;
				const status = this.getNodeParameter('status') as string;
				const priority = this.getNodeParameter('priority') as string;
				const source = this.getNodeParameter('source') as string;
				const options = this.getNodeParameter('options') as IDataObject;
				//const jsonActive = this.getNodeParameter('jsonParameters') as boolean;

				const body: ICreateTicketBody = {
					// @ts-ignore
					status: Status[capitalize(status)],
					// @ts-ignore
					priority: Priority[capitalize(priority)],
					// @ts-ignore
					source: Source[capitalize(source)]
				};

				if (requester === 'requesterId') {
					// @ts-ignore
					if (isNaN(value)) {
						throw new Error('Requester Id must be a number');
					}
					body.requester_id = parseInt(value, 10);
				} else if (requester === 'email') {
					body.email = value;
				} else if (requester === 'facebookId') {
					body.facebook_id = value;
				} else if (requester === 'phone') {
					body.phone = value;
				} else if (requester === 'twitterId') {
					body.twitter_id = value;
				} else if (requester === 'uniqueExternalId') {
					body.unique_external_id = value;
				}

				// if (!jsonActive) {
				// 	const customFieldsUi = this.getNodeParameter('customFieldsUi') as IDataObject;
				// 	if (Object.keys(customFieldsUi).length > 0) {
				// 		const aux: IDataObject = {};
				// 		// @ts-ignore
				// 		customFieldsUi.customFieldsValues.forEach( o => {
				// 			aux[`${o.key}`] = o.value;
				// 			return aux;
				// 		});
				// 		body.custom_fields = aux;
				// } else {
				// 	body.custom_fields = validateJSON(this.getNodeParameter('customFielsJson') as string);
				// }

				if (options.name) {
					body.name = options.name as string;
				}

				if (options.subject) {
					body.subject = options.subject as string;
				} else {
					body.subject = 'null';
				}

				if (options.type) {
					body.type = options.type as string;
				}

				if (options.description) {
					body.description = options.description as string;
				} else {
					body.description = 'null';
				}

				if (options.agent) {
					body.responder_id = options.agent as number;
				}

				if (options.company) {
					body.company_id = options.company as number;
				}

				if (options.product) {
					body.product_id = options.product as number;
				}

				if (options.group) {
					body.group_id = options.group as number;
				}

				if (options.frDueBy) {
					body.fr_due_by = options.frDueBy as string;
				}

				if (options.emailConfigId) {
					body.email_config_id = options.emailConfigId as number;
				}

				if (options.dueBy) {
					body.due_by = options.dueBy as string;
				}

				if (options.tags) {
					body.tags = (options.tags as string).split(',') as [string];
				}

				if (options.ccEmails) {
					body.cc_emails = (options.ccEmails as string).split(',') as [string];
				}

				try {
					response = await freshdeskApiRequest.call(this, '/tickets', 'POST', body);
				} catch (err) {
					throw new Error(`Freskdesk Error: ${JSON.stringify(err)}`);
				}
			}
		}

		return {
			json: response
		};
	}
}
