/// <reference path="../pb_data/types.d.ts" />
onAdminAuthRequest((e) => {
  console.log('onAdminAuthRequest');
  console.log(e.httpContext);
  console.log(e.admin);
  console.log(e.token);

  $app.dao().totalAdmins();
  $app.dao().findAdminByEmail(e.admin);
});
onAdminBeforeAuthWithPasswordRequest((e) => {
  console.log('onAdminBeforeAuthWithPasswordRequest');
  console.log(e.httpContext);
  console.log(e.admin);
  console.log(e.identity);
  console.log(e.password);

  $app.dao().totalAdmins();
});
onAdminAfterAuthWithPasswordRequest((e) => {
  console.log('onAdminAfterAuthWithPasswordRequest');
  console.log(e.httpContext);
  console.log(e.admin);
  console.log(e.identity);
  console.log(e.password);

  $app.dao().totalAdmins();
});
