export const appInsights = {
  trackRequest: (data: any) => {
    console.log('trackRequest', data);
  },
  trackDependency: (data: any) => {
    console.log('trackDependency', data);
  },
  trackException: (data: any) => {
    console.log('trackException', data);
  },
};
