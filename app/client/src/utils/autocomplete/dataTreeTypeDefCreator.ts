import { DataTreeEntity, ENTITY_TYPE } from "entities/DataTree/dataTreeFactory";
import _ from "lodash";
import { generateReactKey } from "utils/generators";
import { entityDefinitions } from "utils/autocomplete/EntityDefinitions";
import { getType, Types } from "utils/TypeHelpers";
import { Def } from "tern";

let extraDefs: any = {};
const skipProperties = ["!doc", "!url", "!type"];

export const dataTreeTypeDefCreator = (
  entity: DataTreeEntity,
  entityName: string,
): { def: Def; name: string } => {
  const defName = `DATA_TREE_${entityName}`;
  const def: any = {
    "!name": defName,
  };
  if (entity && "ENTITY_TYPE" in entity) {
    if (entity.ENTITY_TYPE === ENTITY_TYPE.WIDGET) {
      const widgetType = entity.type;
      if (widgetType in entityDefinitions) {
        const definition = _.get(entityDefinitions, widgetType);
        if (_.isFunction(definition)) {
          const data = definition(entity);
          const allData = flattenObjKeys(data, entityName);
          for (const [key, value] of Object.entries(allData)) {
            def[key] = value;
          }
          def[entityName] = definition(entity);
        } else {
          def[entityName] = definition;
          const allFlattenData = flattenObjKeys(definition, entityName);
          for (const [key, value] of Object.entries(allFlattenData)) {
            def[key] = value;
          }
        }
      }
    }
    if (entity.ENTITY_TYPE === ENTITY_TYPE.ACTION) {
      const actionDefs = entityDefinitions.ACTION(entity);
      def[entityName] = actionDefs;
      const finalData = flattenObjKeys(actionDefs, entityName);
      for (const [key, value] of Object.entries(finalData)) {
        def[key] = value;
      }
    }
    if (entity.ENTITY_TYPE === ENTITY_TYPE.JSACTION) {
      const result: any = _.omit(entity, [
        "ENTITY_TYPE",
        "actionId",
        "pluginType",
      ]);
      const dataObj = entity.data;
      const jsOptions: any = {};
      for (const key in result) {
        if (dataObj.hasOwnProperty(key)) {
          jsOptions[key] =
            "fn(onSuccess: fn() -> void, onError: fn() -> void) -> void";
        } else {
          jsOptions[key] = generateTypeDef(entity[key]);
        }
      }
      def[entityName] = jsOptions;
      const flattenedjsObjects = flattenObjKeys(jsOptions, entityName);
      for (const [key, value] of Object.entries(flattenedjsObjects)) {
        def[key] = value;
      }
    }
    if (entity.ENTITY_TYPE === ENTITY_TYPE.APPSMITH) {
      const options: any = generateTypeDef(_.omit(entity, "ENTITY_TYPE"));
      def.appsmith = options;
    }
  }
  def["!define"] = { ...extraDefs };
  extraDefs = {};
  return { def, name: defName };
};

export function generateTypeDef(
  obj: any,
): string | Record<string, string | Record<string, unknown>> {
  const type = getType(obj);
  switch (type) {
    case Types.ARRAY: {
      const arrayType = generateTypeDef(obj[0]);
      const name = generateReactKey();
      extraDefs[name] = arrayType;
      return `[${name}]`;
    }
    case Types.OBJECT: {
      const objType: Record<string, string | Record<string, unknown>> = {};
      Object.keys(obj).forEach((k) => {
        objType[k] = generateTypeDef(obj[k]);
      });
      return objType;
    }
    case Types.STRING:
      return "string";
    case Types.NUMBER:
      return "number";
    case Types.BOOLEAN:
      return "bool";
    case Types.NULL:
    case Types.UNDEFINED:
      return "?";
    default:
      return "?";
  }
}

export const flattenObjKeys = (
  options: any,
  parentKey: string,
  results: any = {},
): any => {
  const r: any = results;
  for (const [key, value] of Object.entries(options)) {
    if (!skipProperties.includes(key)) {
      r[parentKey + "." + key] = value;
    }
  }
  return r;
};

const skipJSProps = ["ENTITY_TYPE", "name", "meta", "body", "pluginType"];
export const getPropsForJsAction = (
  options: any,
  parentKey: any = "",
  results: any = {},
): any => {
  const r: any = results;
  for (const [key, value] of Object.entries(options)) {
    if (!skipJSProps.includes(key)) {
      const keyToPass = parentKey ? parentKey + "." + key : key;
      if (!_.isObject(value) || Array.isArray(value)) {
        r[keyToPass] = value;
      } else {
        getPropsForJsAction(value, keyToPass, r);
      }
    }
  }
  return r;
};
