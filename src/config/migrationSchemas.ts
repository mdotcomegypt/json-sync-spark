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
      "from": "icon",
      "composeMedia": {
        "metaField": "icon",
        "pathField": "icon_dm",
        "whenType": "image"
      }
    },
    "auroraIcon": {
      "from": "aurora_icon",
      "composeMedia": {
        "metaField": "aurora_icon",
        "pathField": "aurora_icon_dm",
        "whenType": "image"
      }
    },
    "altText": "altText",
    "title": "title",
    "lottieFile": "lottieFile"
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
    "title": "friendlyName",
    "forLabel": "productTypes",
    "configuration": "configuration",
    "items": "whatisnewList"
  }
}`,
  },
  {
    key: "whatIsNewItem",
    label: "whatIsNew > whatIsNewItem",
    json: `{
  "aemModel": "whatsnew ",
  "contentfulType": "whatIsNewSection",
  "fields": {
"editorialId": "id",
    "id": "id",
    "title": "configuration.sectionTitle",
"seeAllLabel": "configuration.sectionSeeAll",
"allLabel": "configuration.all",
"forLabel": "configuration.for",
    "configuration": "configuration",
    "items": "whatisnewList"
  }
}`,
  },
];
