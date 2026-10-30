package org.cesystem.multirole.config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import java.time.ZoneId;
import java.util.TimeZone;
@Configuration @EnableScheduling
public class ApplicationTimeZone {
    public ApplicationTimeZone(@Value("${app.time-zone:Asia/Bangkok}") String zone) {
        TimeZone.setDefault(TimeZone.getTimeZone(ZoneId.of(zone)));
    }
}
