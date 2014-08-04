package org.richfaces.showcase.ftest;

import java.io.File;
import org.jboss.arquillian.container.test.api.Deployment;
import org.jboss.arquillian.container.test.api.RunAsClient;
import org.jboss.arquillian.drone.api.annotation.Drone;
import org.junit.runner.RunWith;
import org.jboss.arquillian.junit.Arquillian;
import org.jboss.shrinkwrap.api.ShrinkWrap;
import org.jboss.shrinkwrap.api.spec.WebArchive;
import org.openqa.selenium.WebDriver;

/**
 *
 * @author <a href="mailto:jhuska@redhat.com">Juraj Huska</a>
 */
@RunAsClient
@RunWith(Arquillian.class)
public class AbstractShowcaseTest {

    @Drone
    protected WebDriver browser;

    @Deployment(testable = false)
    public static WebArchive deploy() {
        WebArchive war = ShrinkWrap.createFromZipFile(WebArchive.class, new File("target/richfaces-showcase-" + System.getProperty("container.classifier") + ".war"));
        return war;
    }

    

}
