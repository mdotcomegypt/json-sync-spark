export interface SavedSchema {
  key: string;
  label: string;
  json: string;
}

export const savedSchemas: SavedSchema[] = [
  {
    key: "microcopy",
    label: "microcopy > microcopy",
    json: `{
  "aemModel": "microcopy",
  "contentfulType": "microcopy",
  "fields": {
    "id": "id",
    "labels": "labels",
    "descriptions": "descriptions",
    "headings": "headings",
    "buttonLabels": "buttonLabels"
  },
  "ignored": [
    "_path",
    "_id",
    "_variation",
    "_metadata",
    "_variations",
    "_model",
    "_tags"
  ],
  "contentfulDefinition": {
    "name": "Microcopy",
    "description": "",
    "displayField": "id",
    "fields": [
      {
        "id": "id",
        "name": "ID",
        "type": "Symbol",
        "localized": false,
        "required": true,
        "validations": [
          { "unique": true }
        ]
      },
      {
        "id": "labels",
        "name": "Labels",
        "type": "Object",
        "localized": true,
        "required": false
      },
      {
        "id": "descriptions",
        "name": "Descriptions",
        "type": "Object",
        "localized": true,
        "required": false
      },
      {
        "id": "headings",
        "name": "Headings",
        "type": "Object",
        "localized": true,
        "required": false
      },
      {
        "id": "buttonLabels",
        "name": "Button Labels",
        "type": "Object",
        "localized": true,
        "required": false
      }
    ]
  }
}`,
  },
  {
    key: "iconMap",
    label: "iconMap > iconMap",
    json: `{
  "aemModel": "iconMap",
  "contentfulType": "iconMap",
  "fields": {
    "id": "id",
    "ariaLabel": "ariaLabel",
    "icon": {
      "to": "icon",
      "composeMedia": {
        "metaField": "icon",
        "pathField": "icon_dm",
        "whenType": "image"
      }
    },
    "aurora_icon": {
      "to": "auroraIcon",
      "composeMedia": {
        "metaField": "aurora_icon",
        "pathField": "aurora_icon_dm",
        "whenType": "image"
      }
    },
    "altText": "altText",
    "title": "title",
    "lottieFile": {
      "to": "lottieFile",
      "composeObject": true
    }
  },
  "ignored": [
    "_path",
    "_id",
    "_variation",
    "_metadata",
    "_variations",
    "_model",
    "_tags",
    "tags"
  ],
  "contentfulDefinition": {
    "name": "Icon Map",
    "description": "",
    "displayField": "id",
    "fields": [
      {
        "id": "id",
        "name": "Id",
        "type": "Symbol",
        "localized": false,
        "required": true
      },
      {
        "id": "ariaLabel",
        "name": "Aria Label",
        "type": "Symbol",
        "localized": false,
        "required": false
      },
      {
        "id": "icon",
        "name": "Icon",
        "type": "Object",
        "localized": false,
        "required": true
      },
      {
        "id": "altText",
        "name": "Alt Text",
        "type": "Symbol",
        "localized": false,
        "required": false
      },
      {
        "id": "auroraIcon",
        "name": "Aurora Icon",
        "type": "Object",
        "localized": false,
        "required": false
      },
      {
        "id": "title",
        "name": "Title",
        "type": "Symbol",
        "localized": false,
        "required": false
      },
      {
        "id": "lottieFile",
        "name": "Lottie File",
        "type": "Object",
        "localized": false,
        "required": false
      }
    ]
  }
}`,
  },
  {
    key: "whatsnew",
    label: "whatsnew Assembly > whatIsNewSection",
    json: `{
  "aemModel": "whatsnew ",
  "contentfulType": "whatIsNewSection",
  "fields": {
    "id": "id",
    "friendlyName": "title",
    "productTypes": "forLabel",
    "configuration": "configuration",
    "whatisnewList": "items"
  }
}`,
  },
  {
    key: "whatIsNewItem",
    label: "whatIsNew > whatIsNewItem",
    json: `{
  "aemModel": "whatIsNew",
  "contentfulType": "whatIsNewItem",
  "fields": {
    "id": "id",
    "title": "title",
    "description": "description",
    "backgroundImage": {
      "to": "backgroundImage",
      "composeMedia": {
        "metaField": "contentUrl",
        "pathField": "contentUrl_dm",
        "whenType": "image"
      }
    },
    "ctaLabel": "ctaLabel",
    "ctaURL": "ctaUrl",
    "campaignData": "campaignData"
  },
  "ignored": [
    "_path",
    "_id",
    "_variation",
    "_metadata",
    "_model",
    "_variations",
    "_tags",
    "aurora_contentUrl",
    "contentUrl_dm",
    "aurora_contentUrl_dm",
    "tags"
  ]
}`,
  },
];
