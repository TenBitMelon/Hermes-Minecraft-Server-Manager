/// <reference path="../pb_data/types.d.ts" />
onAdminAuthRequest((e) => {
  console.log('onAdminAuthRequest');
  console.log(e.httpContext);
  console.log(e.admin);
  console.log(e.token);

  console.log($app.dao().totalAdmins());
  $app.dao().findAdminByEmail(e.admin);
});
onAdminBeforeAuthWithPasswordRequest((e) => {
  console.log('onAdminBeforeAuthWithPasswordRequest');
  console.log(e.httpContext);
  console.log(e.admin);
  console.log(e.identity);
  console.log(e.password);

  console.log($app.dao().totalAdmins());
});
onAdminAfterAuthWithPasswordRequest((e) => {
  console.log('onAdminAfterAuthWithPasswordRequest');
  console.log(e.httpContext);
  console.log(e.admin);
  console.log(e.identity);
  console.log(e.password);

  console.log($app.dao().totalAdmins());
});
