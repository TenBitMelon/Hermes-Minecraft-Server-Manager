onAfterBootstrap((e) => {
  const adminEmail = $os.getenv('POCKETBASE_INTERNAL_ADMIN_EMAIL');
  const adminPassword = $os.getenv('POCKETBASE_INTERNAL_ADMIN_PASSWORD');

  let adminAccount;
  try {
    adminAccount = $app.dao().findAdminByEmail(adminEmail);
  } catch (e) {}
  if (!adminAccount) {
    console.log(`Creating admin account for ${adminEmail}`);

    const admin = new Admin();
    admin.email = adminEmail;
    admin.setPassword(adminPassword);
    $app.dao().saveAdmin(admin);
  }
});
