// CSS module type declarations
declare module "*.css" {
  const content: string;
  export default content;
}

// HTML template module declarations (Lark templates - compiled to functions)
declare module "*.html" {
  // const template: (
  //   data: unknown,
  //   selfId: string,
  //   refData: unknown,
  // ) => string;
  // export default template;
  const content: string;
  export default content;
}
