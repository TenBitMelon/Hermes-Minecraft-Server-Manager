/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);

  const adminEmail = $os.getenv('POCKETBASE_INTERNAL_ADMIN_EMAIL');
  const adminPassword = $os.getenv('POCKETBASE_INTERNAL_ADMIN_PASSWORD');

  const admin = new Admin();
  admin.email = adminEmail;
  admin.setPassword(adminPassword);

  dao.saveAdmin(admin);

  console.log(`Creating admin account with email ${adminEmail}, password ${adminPassword}`);

  // Verify that the admin account was created
  console.log(dao.totalAdmins());
  const aa = dao.findAdminByEmail(adminEmail);
  console.log(aa.created);
  console.log(aa.validatePassword(adminPassword));
  console.log(aa.email);
});
